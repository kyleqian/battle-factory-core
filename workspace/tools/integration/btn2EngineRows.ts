// btn2: per-frame presentation rows of an app-staged battle-lab trace (tools/compare/traces/<id>.json): segment / command / phase / elapsed.
// usage: node --experimental-strip-types --no-warnings tools/integration/btn2EngineRows.ts <trace-id> [out.json]
import { readFileSync, writeFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import { applyTraceStage } from "../compare/appTrace.ts";
import { traceAdvances } from "../compare/traceReplay.ts";
import { createInitialState, tick } from "../../src/engine/core.ts";
import { presentationRngFromTrace } from "../../src/engine/presentationRngHost.ts";

const id = process.argv[2]!;
const trace = JSON.parse(readFileSync(new URL(`../compare/traces/${id}.json`, import.meta.url), "utf8"));
const rng = presentationRngFromTrace(trace);
let state = createInitialState({ appRoute: trace.appRoute, battleScene: trace.battleScene, presentationSeed: rng.seed, presentationRngPolicy: rng.policy });
let frame = 0;
const rows: unknown[] = [];
const sample = (): void => {
  const res = (state as any).factoryRoundBattleOrchestrator?.battleResolutionPresentation;
  if (!res) { rows.push({ f: frame, none: true }); return; }
  const seg = res.segments[res.segmentIndex];
  const cmd = seg?.commands[res.commandIndex];
  rows.push({ f: frame, seg: res.segmentIndex, cmd: res.commandIndex, type: cmd?.type, adv: cmd?.advance, promptGate: cmd?.promptGate, lines: cmd?.lines, phase: res.lifecycle.phase, el: res.lifecycle.phaseElapsed });
};
const applyStage = (): void => { if (trace.appStage && trace.appStage.frame === frame) state = applyTraceStage(trace, state); };
applyStage(); sample();
for (const advance of traceAdvances(trace.segments)) {
  state = tick(state, advance.buttons);
  frame = advance.frame;
  applyStage();
  sample();
}
// compress: print a row whenever (seg, cmd, phase) changes
let prev = "";
const out: string[] = [];
for (const r of rows as any[]) {
  const k = `${r.seg}/${r.cmd}/${r.type}/${r.phase}/${r.none ?? ""}`;
  if (k !== prev) { out.push(`${r.f}\t${k}\t${r.adv ?? ""}${r.promptGate ? " gate" : ""}\t${JSON.stringify(r.lines ?? "")}\tel=${r.el}`); prev = k; }
}
console.log(out.join("\n"));
if (process.argv[3]) writeFileSync(process.argv[3], JSON.stringify(rows));
