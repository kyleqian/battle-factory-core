// hpd4: per-frame presented-command starts of a compare trace's app side, with each move-animation's row breakdown
// (seGate, script lead, pre, idle lead, live, post, script tail, total).
//   node --experimental-strip-types --no-warnings tools/integration/hpd4Cmds.ts <trace.json> [maxFrame]
import "../../src/engine/monPicPixelsInstall.ts";
import { createInitialState, tick } from "../../src/engine/core.ts";
import { liveMoveAnimationDuration } from "../../src/engine/liveMoveAnimation.ts";
import { currentCommandField, liveMoveIdleLeadRows, liveMoveScriptTailFrames, liveMoveUniversalRows } from "../../src/engine/battleResolutionPresentationRender.ts";
import { APP_STAGES } from "../compare/appTrace.ts";
import { loadCompareTrace } from "../compare/traceFile.ts";
import { traceAdvances } from "../compare/traceReplay.ts";

const [tracePath, maxArg] = process.argv.slice(2) as [string, string | undefined];
const trace = loadCompareTrace(tracePath);
const maxFrame = maxArg === undefined ? 1e9 : Number(maxArg);
let state: any = createInitialState({ appRoute: trace.appRoute, battleScene: trace.battleScene });
if (trace.appStage) state = APP_STAGES[trace.appStage.id]!(state);
let last = "";
let n = 0;
for (const advance of traceAdvances(trace.segments)) {
  if (advance.frame > maxFrame) break;
  state = tick(state, advance.buttons);
  n = advance.frame;
  const r = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
  let key = "NORES";
  if (r) {
    const segment = r.segments[r.segmentIndex];
    const c = segment?.commands[r.commandIndex];
    let extra = "";
    if (c?.type === "move-animation" && c.animation) {
      const field = currentCommandField(r);
      const live = field ? liveMoveAnimationDuration(c.animation, field) : "?";
      const rows = field ? liveMoveUniversalRows(c.animation, field) : { pre: "?", post: "?" };
      const idle = field ? liveMoveIdleLeadRows(c.animation, field) : "?";
      const tail = field ? liveMoveScriptTailFrames(c.timing, c.animation, field) : "?";
      extra = `move=${c.animation.moveId} atk=${c.animation.attacker} gate=${c.timing.seGateFrames ?? 0} lead=${c.timing.scriptLeadFrames ?? 0} bodyLead=${c.timing.bodyLeadFrames ?? 0} pre=${rows.pre} idle=${idle} live=${live} post=${rows.post} tail=${tail} tailRows=${c.timing.scriptTailRows ?? 0}`;
    } else if (c?.lines) extra = JSON.stringify(c.lines).slice(0, 50);
    else if (c?.timing) extra = JSON.stringify(c.timing);
    key = `${r.segmentIndex}.${r.commandIndex} ${c?.type} ${r.lifecycle.phase} ${extra}`;
  }
  if (key !== last) { console.log(`${n} ${key}`); last = key; }
}
