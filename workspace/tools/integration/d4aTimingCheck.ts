// usage: node --experimental-strip-types --no-warnings tools/integration/d4aTimingCheck.ts OUT.json fixture.json...
// D4 faithful-timing check (ANIMATION_VERIFICATION.md "CPU-load timing integration"): every fixture runs verifyLiveAdapterFramebuffer (two fresh
// probe processes, production live renderer, complete dense window from the scenario's own activation). A window measured in the policy's chosen
// phase must be pixel-exact on every row and its length must equal the live duration. A window measured in the other phase must differ ONLY on
// the documented rows (docs/animation-integration-live-status.json faithfulTimingAdapters[].alternatePhaseResidual.ages); an entry without
// documented rows is documented-empty (any nonzero residual fails). The affected ages and the max differing pixels per row are recorded.
// Exit 1 on any violation.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { verifyLiveAdapterFramebuffer } from "./liveAdapterFramebuffer.ts";
import { LIVE_MOVE_TIMING_POLICY, type LiveMoveTimingParameterKind, type LiveMoveTimingPhase } from "../../src/engine/liveMoveTimingPolicy.ts";

const IDS: Record<string, number> = { MACH_PUNCH: 183, NIGHTMARE: 171, MEGAHORN: 224, REVENGE: 279, METEOR_MASH: 309, PSYWAVE: 149, EXTRASENSORY: 326, SUPERPOWER: 276, SHOCK_WAVE: 351, ICE_BALL: 301, DIVE: 291, SHEER_COLD: 329, HYPER_VOICE: 304, EXTREME_SPEED: 245, MEMENTO: 262, SKILL_SWAP: 285, FLATTER: 260, PURSUIT: 228, HIDDEN_POWER: 237, CONFUSE_RAY: 109, ICY_WIND: 196, BLIZZARD: 59, FAINT_ATTACK: 185, LIGHT_SCREEN: 113, SKY_ATTACK: 143 };
const [outPath, ...paths] = process.argv.slice(2);
const status = JSON.parse(readFileSync("docs/animation-integration-live-status.json", "utf8"));
// A move whose other-phase residual differs per window (D4c Extrasensory: the scanout split) documents it per fixture
// (alternatePhaseResidual.windows[fixture basename].ages); otherwise the move-level ages apply.
const documented = (id: number, fixture: string): number[] => {
  const r = (status.faithfulTimingAdapters as { id: number; alternatePhaseResidual?: { ages?: number[]; windows?: Record<string, { ages: number[] }> } }[])
    .find((e) => e.id === id)?.alternatePhaseResidual;
  const tag = fixture.split("/").pop()!.replace(/\.json$/, "");
  return r?.windows?.[tag]?.ages ?? r?.ages ?? [];
};
const out: Record<string, unknown>[] = [];
let failed = false;
for (const path of paths) {
  // A wrapper fixture (prep41 windows: { sourceFixture, denseWindow, timingPhase }) overlays its banked source fixture.
  const raw = JSON.parse(readFileSync(path, "utf8")) as { sourceFixture?: string };
  const fixture = { ...(raw.sourceFixture ? JSON.parse(readFileSync(raw.sourceFixture, "utf8")) : {}), ...raw } as { move: string; timingPhase: LiveMoveTimingPhase;
    timingPhases?: Partial<Record<LiveMoveTimingParameterKind, LiveMoveTimingPhase>>; attacker: { geometry: { side: "player" | "opponent" } };
    requestFields?: { rolloutCounter?: number }; precedingBodies?: unknown[]; precedingTurns?: unknown; precedingX2Events?: unknown };
  const id = IDS[fixture.move]!;
  // Every policy parameter of the move: the window is in the selected phase iff each measured phase equals the policy's choice
  // (a fixture without timingPhases measured only the optional lag).
  const measured = fixture.timingPhases ?? { "optional-lag-age": fixture.timingPhase };
  // A per-side parameter (Superpower's monbg write row) applies to the fixture's attacker side only.
  // A scoped-exact move (no policy entry, e.g. Shock Wave) has no CPU-phase parameter: every window is in the "selected" phase (zero residual, duration).
  // A per-counter parameter (Ice Ball's lag rows per rollout-counter body) applies to the fixture's request.rolloutCounter only.
  // A body-keyed parameter (d4later: Sheer Cold / Extrasensory opponent later bodies) applies to the fixture's body class (liveAdapterFramebuffer.ts
  // withFirstBody: a later body declares preceding units) and replaces the unkeyed parameter of its kind (liveMoveTimingPolicy.ts precedence).
  const body = process.env.POKEBENCH_LIVE_ORDER_INPUT !== "first-body"
    && (fixture.precedingBodies?.length || fixture.precedingTurns || fixture.precedingX2Events) ? "later" : "first";
  const matching = (LIVE_MOVE_TIMING_POLICY[id]?.parameters ?? []).filter((p) => (p.side === undefined || p.side === fixture.attacker.geometry.side)
    && (p.rolloutCounter === undefined || p.rolloutCounter === fixture.requestFields?.rolloutCounter) && (p.body === undefined || p.body === body));
  const parameters = matching.filter((p) => p.body !== undefined || !matching.some((q) => q.kind === p.kind && q.body !== undefined));
  const policyPhases = Object.fromEntries(parameters.map((p) => [p.kind, p.chosen]));
  const results = verifyLiveAdapterFramebuffer(path);
  const runs = results.map((r) => {
    const rows = (JSON.parse(readFileSync(join(r.scratch as string, "live-comparison.json"), "utf8")).comparisons as { age: number; residualPixels: number }[]);
    const affected = rows.filter((row) => row.residualPixels > 0);
    return { rows: rows.length, exactRows: r.exactRows, residualPixels: r.residualPixels, digest: r.digest,
      affectedAges: affected.map((row) => row.age), maxPixelsPerRow: Math.max(0, ...affected.map((row) => row.residualPixels)) };
  });
  const selected = parameters.every((p) => measured[p.kind] === p.chosen);
  const doc = documented(id, path);
  const run0 = runs[0]!;
  const violations: string[] = [];
  // A window without a measured label for one of the move's parameter kinds is unclassified, never silently "other phase".
  const unlabeled = parameters.filter((p) => measured[p.kind] !== "event" && measured[p.kind] !== "no-event").map((p) => p.kind);
  if (unlabeled.length) violations.push(`missing measured phase label for ${unlabeled.join(", ")}`);
  if (runs.some((r) => r.digest !== run0.digest)) violations.push("fresh runs differ");
  if (selected) {
    if (run0.residualPixels !== 0) violations.push(`selected phase residual ${run0.residualPixels} px on ages ${run0.affectedAges.join(",")}`);
    if (results[0]!.expectedDuration !== run0.rows) violations.push(`duration ${results[0]!.expectedDuration} != window ${run0.rows}`);
  } else {
    const outside = run0.affectedAges.filter((age) => !doc.includes(age));
    if (outside.length) violations.push(`other-phase residual outside the documented rows: ages ${outside.join(",")}`);
  }
  failed ||= violations.length > 0;
  const entry = { fixture: path, move: fixture.move, body, measuredPhase: fixture.timingPhase, policyPhase: policyPhases["optional-lag-age"],
    ...(fixture.timingPhases ? { measuredPhases: measured, policyPhases } : {}), selectedPhase: selected,
    window: run0.rows, expectedDuration: results[0]!.expectedDuration, runs, documentedAges: selected ? null : doc, violations };
  out.push(entry);
  console.log(path, JSON.stringify({ phase: fixture.timingPhase, selected, rows: run0.rows, px: runs.map((r) => r.residualPixels), ages: run0.affectedAges.length ? `${run0.affectedAges[0]}..${run0.affectedAges.at(-1)} (${run0.affectedAges.length})` : "-", maxPxRow: run0.maxPixelsPerRow, violations }));
}
writeFileSync(outPath!, JSON.stringify(out, null, 1) + "\n");
if (failed) process.exitCode = 1;
