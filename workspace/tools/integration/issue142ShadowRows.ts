/**
 * ISSUES #142 per-move "shadow row" table (evidence only; new file, no production edit).
 *
 *   python3 tools/integration/issue142ShadowRowsResolve.py /tmp/i142-resolved.json      # fixtures + audit activations
 *   (mgba venv) tools/integration/issue142ActivationRun.py /tmp/i142-resolved.json     # activation probes for unaudited scenarios
 *   node --experimental-strip-types tools/integration/issue142ShadowRows.ts /tmp/i142-resolved.json
 *
 * shadowRow (live age on which the source enemy shadow is still displayed) = activationFrame - windowStart + ageOffset, where
 * live row i = ROM frame windowStart + i, live age = i + ageOffset (liveAdapterFramebuffer.ts verifyLiveAdapterFramebuffer).
 * currentlyDrawn: renders production renderBattleResolutionLiveView (via liveAdapterFramebuffer.liveView) with an elevated
 * GOLBAT opponent at every age 0..duration-1 and counts the 200 mask pixels of battle-enemy-shadow.json at (160,65); only a
 * full 200/200 match is "drawn" (partial matches are body-colour coincidences, listed as partialRows).
 * Modes: (default) orchestrate; `render <jobs.json> <out.json>` child.
 */
import { spawn } from "node:child_process";
import "../../src/engine/monPicPixelsInstall.ts";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const FULL = 200;

async function renderMode(jobsPath: string, outPath: string) {
  const { liveView } = await import("./liveAdapterFramebuffer.ts");
  const { renderBattleResolutionLiveView } = await import("../../src/engine/battleScene.ts");
  const { liveMoveAnimationDuration } = await import("../../src/engine/liveMoveAnimation.ts");
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
  const jobs = JSON.parse(readFileSync(jobsPath, "utf8")) as { key: string; move: string; orientation: "player" | "opponent"; body: string }[];
  const out: Record<string, any> = {};
  for (const j of jobs) {
    const mk = (opp: string) => ({
      move: j.move, body: j.body as "normal" | "shattered-wall", probe: "", scenario: "",
      attacker: { species: j.orientation === "player" ? "PHANPY" : opp, geometry: { side: j.orientation } },
      target: { species: j.orientation === "player" ? opp : "PHANPY", geometry: { side: j.orientation === "player" ? "opponent" : "player" } },
      fieldProfile: { playerHp: 120, playerMaxHp: 120, opponentHp: 120, opponentMaxHp: 120, playerGender: "male", opponentGender: "male" },
    });
    try {
      const f = mk("GOLBAT");
      const view0 = liveView(f as any, 0);
      const duration = liveMoveAnimationDuration((view0.effect as any).request, view0.field) as number;
      const golbat: number[] = [];
      for (let age = 0; age < duration; age++) {
        const fb = new Uint8Array(240 * 160 * 4);
        renderBattleResolutionLiveView(fb, liveView(f as any, age));
        golbat.push(count(fb));
      }
      // No control subtraction: a non-elevated control (ONIX/RATTATA/...) still matches 0..177 mask pixels through its own
      // body colours, so only a FULL 200/200 mask match counts as "shadow drawn"; 0<n<200 is reported separately as ambiguous.
      out[j.key] = { duration, counts: golbat };
    } catch (e) { out[j.key] = { error: String((e as Error).message ?? e) }; }
  }
  writeFileSync(outPath, JSON.stringify(out));
}

if (process.argv[2] === "render") {
  await renderMode(process.argv[3]!, process.argv[4]!);
} else {
  const resolved = JSON.parse(readFileSync(process.argv[2]!, "utf8")) as Record<string, any>;
  const probes = JSON.parse(readFileSync(resolve(repo, "tools/integration/fixtures/issue142-activation-probes.json"), "utf8"));
  // chosen candidate per row: audited candidates first (resolver order), else probe-derived from probeNeeded
  const rows: any[] = [];
  for (const [key, r] of Object.entries(resolved) as [string, any][]) {
    const cands: any[] = [...r.candidates];
    for (const pn of r.probeNeeded ?? []) {
      const iv = probes[`${pn.scenario}|${pn.probeMoveId ?? "None"}`]?.intervals as { move: number; start: number; end: number }[] | undefined;
      const want = pn.probeMoveId ?? r.id;
      const bodies = (iv ?? []).filter(x => x.move === want);
      if (!bodies.length) continue;
      const cont = bodies.filter(b => b.start <= pn.windowStart && pn.windowStart <= b.end);
      const b = (cont.length ? cont : bodies).reduce((a, c) => Math.abs(c.start - pn.windowStart) < Math.abs(a.start - pn.windowStart) ? c : a);
      cands.push({ ...pn, audit: "issue142-activation-probes.json (issue142ActivationProbe.py)", bodies: bodies.map(x => [x.start, x.end]),
        activationFrame: b.start, cleanup: b.end, bodyContainsWindowStart: cont.length > 0 });
    }
    rows.push({ key, r, cands });
  }
  // render jobs: one per (id, orientation, body)
  const jobs = rows.map(x => ({ key: x.key, move: x.r.move, orientation: x.r.orientation, body: x.cands[0]?.body ?? "normal" }));
  const dir = mkdtempSync(join(tmpdir(), "i142rows-"));
  const N = 8, shardFiles: string[] = [];
  await Promise.all(Array.from({ length: N }, (_, s) => new Promise<void>((res, rej) => {
    const jf = join(dir, `jobs${s}.json`), of = join(dir, `out${s}.json`);
    writeFileSync(jf, JSON.stringify(jobs.filter((_, i) => i % N === s)));
    shardFiles.push(of);
    const p = spawn(process.execPath, ["--experimental-strip-types", "--no-warnings", fileURLToPath(import.meta.url), "render", jf, of]);
    let err = ""; p.stderr.on("data", d => { err += d; });
    p.on("close", code => (code === 0 ? res() : rej(new Error(`shard ${s}: ${err.slice(-800)}`))));
  })));
  const render: Record<string, any> = Object.assign({}, ...shardFiles.map(f => JSON.parse(readFileSync(f, "utf8"))));
  const table: any[] = [];
  for (const { key, r, cands } of rows) {
    const rd = render[key];
    const c = cands[0];
    const e: any = { id: r.id, move: r.move, orientation: r.orientation };
    if (rd?.error) { e.error = rd.error; table.push(e); continue; }
    const counts = rd.counts as number[];
    const drawnRows = counts.map((n, i) => (n === FULL ? [i, n] : null)).filter(Boolean) as number[][];
    const partialRows = counts.map((n, i) => (n > 0 && n < FULL ? [i, n] : null)).filter(Boolean) as number[][];
    e.duration = rd.duration;
    if (c) {
      e.activationFrame = c.activationFrame; e.windowStart = c.windowStart; e.ageOffset = c.ageOffset;
      e.shadowRow = c.activationFrame - c.windowStart + c.ageOffset;
      e.inWindow = e.shadowRow >= 0 && e.shadowRow < rd.duration;
      e.offsetWindowStartMinusActivation = c.windowStart - c.activationFrame;
    } else { e.shadowRow = null; e.inWindow = null; e.unresolved = r.notes.join("; ") || "no accepted window / activation"; }
    e.drawnRows = drawnRows;                       // [age, mask pixels] with net>0
    e.partialRows = partialRows;                   // ambiguous (body/effect coincidence or occlusion); not counted as drawn
    e.currentlyDrawn = e.inWindow ? counts[e.shadowRow] === FULL : null;
    e.needsFix = e.inWindow === null ? null : e.inWindow && !e.currentlyDrawn;
    // After cleanup (first frame gAnimScriptActive is false) SpriteCB_EnemyShadow shows the shadow again
    // (battle_gfx_sfx_util.c:1214), so rows at/after the cleanup frame are legitimately drawn, not "wrong".
    const tailAge = c ? c.cleanup - c.windowStart + c.ageOffset : Infinity;
    e.cleanupFrame = c?.cleanup ?? null; e.tailFirstAge = c ? tailAge : null;
    e.tailDrawnRows = drawnRows.filter(([a]) => a >= tailAge && a !== e.shadowRow);
    e.tailMissingRows = c ? counts.map((n, a) => (a >= tailAge && a < rd.duration && n !== FULL ? a : -1)).filter(a => a >= 0).length : null;
    e.wronglyDrawnRows = drawnRows.filter(([a]) => a !== e.shadowRow && a < tailAge);
    e.wronglyDrawn = e.wronglyDrawnRows.length > 0;
    e.sources = { fixture: c?.fixture, scenario: c?.scenario, activation: c?.audit, windowKind: c?.windowKind, body: c?.body,
      scriptBodies: c?.bodies, bodyContainsWindowStart: c?.bodyContainsWindowStart,
      otherCandidates: cands.slice(1).map((o: any) => ({ fixture: o.fixture, windowStart: o.windowStart, activationFrame: o.activationFrame })) };
    table.push(e);
  }
  const ids = (f: (e: any) => boolean) => [...new Set(table.filter(f).map(e => e.id))];
  const summary = {
    rows: table.length,
    needsFix: table.filter(e => e.needsFix === true).length,
    wronglyDrawn: table.filter(e => e.wronglyDrawn).length,
    alreadyCorrect: table.filter(e => e.inWindow === true && e.currentlyDrawn && !e.wronglyDrawn).length,
    notInWindow: table.filter(e => e.inWindow === false).length,
    unresolved: table.filter(e => e.inWindow === null).length,
    needsFixIds: ids(e => e.needsFix === true), wronglyDrawnIds: ids(e => e.wronglyDrawn),
  };
  writeFileSync(resolve(repo, "tools/integration/fixtures/issue142-shadow-rows.json"),
    JSON.stringify({ schema: "issue142-shadow-rows/v1", generated: "tools/integration/issue142ShadowRows.ts", summary, rows: table }, null, 1) + "\n");
  console.log(JSON.stringify(summary));
}
