// Elevated-opponent post-body audit (docs/elevated-postbody-audit.md): for each live fixture, the ROM frames around the body end E
// (retained fresh run, POKEBENCH_LIVE_EVIDENCE_DIR of liveFixtureBatch.sh, sha256-checked) against the production views:
//   k <= 0  : liveView(f, age)                         (the body's last rows, dense acceptance path)
//   k >= 1  : the ordinary field = the same displayed field with NO live effect (what the queue shows after the move-animation command)
// Compared in the opponent-sprite window (x 136..215, y 0..72: excludes both healthboxes, the text box and the player sprite).
// POKEBENCH_POSTBODY_FORCED=1 additionally ignores nothing: the window is the same, the ROM may already hide the target (forced switch).
//   node --experimental-strip-types tools/integration/elevatedPostbodyCompare.ts <evidence-dir> <tail> <window:opp|plr|all> <fixture.json>...
// EP_DIAG=1 prints each residual frame's bbox, top ROM<-live colour pairs and the best rigid shift of the live window to the ROM (stderr).
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
// EP_RENDERER=battleScene.patched.ts renders through an untracked in-memory-patched copy (patch proof, never committed).
const { renderBattleResolutionLiveView, patchProof } = await import(`../../src/engine/${process.env.EP_RENDERER ?? "battleScene.ts"}`);
import { liveMoveAnimationDuration, liveMoveOpponentShadowPostBodyHideRows } from "../../src/engine/liveMoveAnimation.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";

const [evidence, tailArg, windowArg, ...fixtures] = process.argv.slice(2);
if (!evidence || !tailArg || !windowArg || fixtures.length === 0) throw new Error("usage: <evidence-dir> <tail> <opp|plr|all> <fixture.json>...");
const tail = Number(tailArg);
const BOX = { opp: [136, 0, 216, 73], plr: [0, 40, 100, 112], all: [0, 0, 240, 112] }[windowArg as "opp"]!;
const hash = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const inBox = (p: number) => { const x = p % 240, y = (p / 240) | 0; return x >= BOX[0]! && x < BOX[2]! && y >= BOX[1]! && y < BOX[3]!; };
const px = (b: Uint8Array, p: number, stride: number) => (b[p * stride]! << 16) | (b[p * stride + 1]! << 8) | b[p * stride + 2]!;
const out: Record<string, unknown>[] = [];
for (const path of fixtures) {
  const source = JSON.parse(readFileSync(path, "utf8")) as Fixture;
  const f: Fixture = source.sourceFixture ? { ...JSON.parse(readFileSync(source.sourceFixture, "utf8")), ...source } : source;
  const window = (f.denseWindow ?? f.sourceWindow)!;
  const E = window.endFrame;
  const scriptEndMinusE = (f as unknown as { speciesAudit?: { swappedBody?: number[] } }).speciesAudit?.swappedBody?.[2] ?? E;
  let request: never;
  try { request = (liveView(f, 0).effect as { request: never }).request; } catch (e) {
    out.push({ fixture: basename(path), error: String((e as Error).message).slice(0, 120) }); continue;
  }
  const duration = liveMoveAnimationDuration(request)!;
  const view = (k: number) => k <= 0 ? liveView(f, Math.min(duration - 1, E - window.startFrame + k))
    // Production (no EP_RENDERER): ISSUES #147's post-body hide table supplies the hidden rows, not the ROM script end.
    : { ...liveView(f, 0), effect: null, postBodyShadowHidden: k <= liveMoveOpponentShadowPostBodyHideRows(request) };
  for (const run of [0, 1]) {
    const dir = join(evidence, `${basename(path, ".json")}-run${run}`);
    if (!existsSync(dir)) continue;
    const probe = JSON.parse(readFileSync(join(dir, "probe.json"), "utf8"));
    const frames = new Map<number, string>(Array.isArray(probe.sha256)
      ? probe.sha256.map((s: string, i: number) => [i, s]) : (probe.frames ?? probe.rows).map((r: { frame: number; sha256: string }) => [r.frame, r.sha256]));
    let unreceipted = 0;
    const rows: { k: number; residual: number; romShadow: boolean; bbox?: number[]; pairs?: string; shift?: string }[] = [];
    for (let k = -3; k <= tail; k++) {
      const frame = E + k;
      if (!existsSync(join(dir, "rgb", `${String(frame).padStart(5, "0")}.rgb`))) break;
      const rgb = readFileSync(join(dir, "rgb", `${String(frame).padStart(5, "0")}.rgb`));
      // Frames outside a probe's recorded sha256 range (the older per-move probes) are read unreceipted from the same fresh run.
      if (frames.has(frame)) { if (hash(rgb) !== frames.get(frame)) throw new Error(`${dir}: RGB receipt drift at ${frame}`); } else unreceipted++;
      const rgba = new Uint8Array(240 * 160 * 4);
      // Patch proof only: the shadow returns on framebuffer scriptEnd + 1 (scriptEnd = first frame with no active script).
      if (patchProof) patchProof.suppressShadow = k > 0 && k <= scriptEndMinusE - E;
      renderBattleResolutionLiveView(rgba, view(k) as never);
      let residual = 0, x0 = 240, y0 = 160, x1 = -1, y1 = -1; const pairs = new Map<string, number>();
      for (let p = 0; p < 240 * 160; p++) {
        if (!inBox(p) || px(rgb, p, 3) === px(rgba, p, 4)) continue;
        residual++; const x = p % 240, y = (p / 240) | 0;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        const key = `${px(rgb, p, 3).toString(16).padStart(6, "0")}<-${px(rgba, p, 4).toString(16).padStart(6, "0")}`;
        pairs.set(key, (pairs.get(key) ?? 0) + 1);
      }
      // ROM elevated-enemy shadow: the 32x8 blob at x160..191 y65..72 in colour 526b63 (>= 100 px = drawn).
      let shadowPx = 0;
      for (let y = 65; y <= 72; y++) for (let x = 160; x <= 191; x++) if (px(rgb, y * 240 + x, 3) === 0x526b63) shadowPx++;
      const row: (typeof rows)[number] = { k, residual, romShadow: shadowPx >= 100 };
      if (residual > 0) {
        row.bbox = [x0, y0, x1, y1];
        row.pairs = [...pairs].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c, n]) => `${c}:${n}`).join(" ");
        let best = [residual, 0, 0];
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
          let r = 0;
          for (let p = 0; p < 240 * 160; p++) {
            if (!inBox(p)) continue;
            const x = (p % 240) - dx, y = ((p / 240) | 0) - dy;
            if (x < 0 || x > 239 || y < 0 || y > 159) { r++; continue; }
            if (px(rgb, p, 3) !== px(rgba, y * 240 + x, 4)) r++;
          }
          if (r < best[0]!) best = [r, dx, dy];
        }
        row.shift = `${best[1]},${best[2]}:${best[0]}`;
      }
      rows.push(row);
      if (process.env.EP_DIAG && residual > 0 && run === 0) console.error(`${basename(path)} k=${k} ${residual} bbox ${row.bbox} ${row.pairs} bestShift(live->rom dx,dy:res) ${row.shift}`);
    }
    const sa = (f as unknown as { speciesAudit?: { swappedBody?: number[] } }).speciesAudit?.swappedBody;
    out.push({ fixture: basename(path), run, E, window: windowArg, rows: rows.length, unreceiptedRows: unreceipted,
      scriptEndMinusE: sa ? sa[2]! - E : null, romShadowRuns: rows.filter((r, i) => r.romShadow !== (rows[i - 1]?.romShadow ?? false)).map(r => `${r.romShadow ? "+" : "-"}${r.k}`),
      bodyRowsResidual: rows.filter(r => r.k <= 0).reduce((a, r) => a + r.residual, 0),
      postRowsResidual: rows.filter(r => r.k > 0).reduce((a, r) => a + r.residual, 0),
      postExact: rows.filter(r => r.k > 0 && r.residual === 0).length, postRows: rows.filter(r => r.k > 0).length,
      firstPost: rows.filter(r => r.k > 0).slice(0, 3), ...(process.env.EP_ROWS ? { allRows: rows } : {}), digest: hash(Buffer.from(JSON.stringify(rows))) });
  }
}
console.log(JSON.stringify(out, null, 1));
