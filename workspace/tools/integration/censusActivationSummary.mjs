// Summarizes tools/integration/fixtures/census-activation/*.json (direct-mGBA activation probes run by censusActivation.sh)
// against the accepted evidence windows, and writes census-activation/summary.json. Pure node, no oracle. Run from workspace/.
import fs from "node:fs";
const DIR = "tools/integration/fixtures/census-activation";
const rd = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const win = (o) => o?.denseWindow ?? o?.sourceWindow ?? o?.sourceVisualWindow ?? o?.window ?? null;
const CASES = [
  // [move id, name, probe scenario, accepted fixture, selector]
  [332, "AERIAL_ACE", "aerial-ace-pidgeotto-onix", "tools/compare/fixtures/aerial-ace-pidgeotto-onix.json"],
  [332, "AERIAL_ACE", "aerial-ace-player-pidgeotto-onix", "tools/compare/fixtures/aerial-ace-player-pidgeotto-onix.json"],
  [98, "QUICK_ATTACK", "quick-attack-pidgeotto-onix", "tools/compare/fixtures/quick-attack-pidgeotto-onix.json"],
  [98, "QUICK_ATTACK", "quick-attack-player-pidgeotto-onix", "tools/compare/fixtures/quick-attack-player-pidgeotto-onix.json"],
  [297, "FEATHER_DANCE", "feather-dance-pidgeotto-onix", "tools/compare/fixtures/feather-dance-pidgeotto-onix.json"],
  [297, "FEATHER_DANCE", "feather-dance-player-pidgeotto-onix", "tools/compare/fixtures/feather-dance-player-pidgeotto-onix.json"],
  [313, "FAKE_TEARS", "fake-tears-opponent-delcatty-player-shuckle", "tools/compare/fixtures/fake-tears-opponent-delcatty-player-shuckle.json"],
  [313, "FAKE_TEARS", "fake-tears-player-delcatty-opponent-shuckle", "tools/compare/fixtures/fake-tears-player-delcatty-opponent-shuckle.json"],
  [214, "SLEEP_TALK", "sleep-talk-opponent-seaking-player-onix", "tools/compare/fixtures/sleep-talk-opponent-seaking-player-onix.json"],
  [214, "SLEEP_TALK", "sleep-talk-player-seaking-opponent-onix", "tools/compare/fixtures/sleep-talk-player-seaking-opponent-onix.json"],
  [209, "SPARK", "spark-opponent-minun-player-shuckle", "tools/compare/fixtures/spark-opponent-minun-player-shuckle.json"],
  [209, "SPARK", "spark-player-minun-opponent-shuckle", "tools/compare/fixtures/spark-player-minun-opponent-shuckle.json"],
  [179, "REVERSAL", "reversal-player-delcatty-opponent-vigoroth", "tools/compare/fixtures/reversal-player-delcatty-opponent-vigoroth.json"],
  [179, "REVERSAL", "reversal-player-vigoroth-opponent-delcatty", "tools/compare/fixtures/reversal-player-vigoroth-opponent-delcatty.json"],
  [222, "MAGNITUDE", "magnitude-intense-opponent-camerupt-player-onix", "tools/compare/fixtures/magnitude-dense-evidence.json", "intense-opponent"],
  [222, "MAGNITUDE", "magnitude-intense-player-camerupt-opponent-onix", "tools/compare/fixtures/magnitude-dense-evidence.json", "intense-player"],
  [222, "MAGNITUDE", "magnitude-regular-opponent-graveler-player-onix", "tools/compare/fixtures/magnitude-dense-evidence.json", "regular-opponent"],
  [222, "MAGNITUDE", "magnitude-regular-player-graveler-opponent-onix", "tools/compare/fixtures/magnitude-dense-evidence.json", "regular-player"],
];
const rows = [];
for (const [id, move, probe, fx, body] of CASES) {
  const pf = `${DIR}/mechanic-${probe}.json`;
  if (!fs.existsSync(pf) || !fs.existsSync(fx)) { rows.push({ move, probe, error: "missing probe or fixture" }); continue; }
  const p = rd(pf), f = rd(fx);
  const iv = p.intervals.find((i) => i.move === id);
  const w = body ? win(f.bodies.find((b) => b.id === body)) : win(f);
  const stage = f.appStage ?? null;
  const row = { move, probe, activation: iv?.start ?? null, scriptEnd: iv?.end ?? null, scriptFrames: iv && iv.end != null ? iv.end - iv.start : null,
    window: w ? { start: w.startFrame, end: w.endFrame } : null, appStage: stage };
  if (iv && w) {
    row.activationMinusWindowStart = iv.start - w.startFrame;
    row.windowEndMinusScriptEnd = iv.end != null ? w.endFrame - iv.end : null;
    if (stage?.oracleFrame !== undefined) row.reducerAgeAtActivation = iv.start - stage.oracleFrame + stage.presentationAge; // age basis for a live window that starts at the activation frame
  }
  rows.push(row);
}
fs.writeFileSync(`${DIR}/summary.json`, JSON.stringify({ schema: "census-activation-summary/v1", note: "activation = first frame with gAnimScriptActive for the move id (issue142ActivationProbe.py, direct mGBA, Scene ON, one fresh run per scenario); window = accepted evidence window; shadow row = activationMinusWindowStart + ageOffset", rows }, null, 1) + "\n");
console.log(rows.map((r) => `${r.move.padEnd(13)} ${r.probe.slice(0, 44).padEnd(44)} act ${r.activation} win ${r.window?.start}..${r.window?.end} d=${r.activationMinusWindowStart} tail=${r.windowEndMinusScriptEnd} age@act=${r.reducerAgeAtActivation ?? "-"}`).join("\n"));
