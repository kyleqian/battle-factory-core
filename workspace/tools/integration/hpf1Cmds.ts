// hpf1: per presented command of a compare trace's app side: start frame, type, the kernel event's opcode and instructionExecution, hp bar frames.
//   node --experimental-strip-types --no-warnings tools/integration/hpf1Cmds.ts <trace.json> [maxFrame]
import "../../src/engine/monPicPixelsInstall.ts";
import { createInitialState, tick } from "../../src/engine/core.ts";
import { loadBattleScriptProgram } from "../../src/engine/battleScriptProgram.ts";
import { battleHealthBarAnimationFrames } from "../../src/engine/healthboxAssembly.ts";
import { currentCommandField } from "../../src/engine/battleResolutionPresentationRender.ts";
import { APP_STAGES } from "../compare/appTrace.ts";
import { loadCompareTrace } from "../compare/traceFile.ts";
import { traceAdvances } from "../compare/traceReplay.ts";

const [tracePath, maxArg] = process.argv.slice(2) as [string, string | undefined];
const trace = loadCompareTrace(tracePath);
const maxFrame = maxArg === undefined ? 1e9 : Number(maxArg);
const program = loadBattleScriptProgram();
let state: any = createInitialState({ appRoute: trace.appRoute, battleScene: trace.battleScene });
if (trace.appStage) state = APP_STAGES[trace.appStage.id]!(state);
let last = "";
for (const advance of traceAdvances(trace.segments)) {
  if (advance.frame > maxFrame) break;
  state = tick(state, advance.buttons);
  const r = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
  if (!r) continue;
  const segment = r.segments[r.segmentIndex];
  const c = segment?.commands[r.commandIndex];
  const key = `${r.segmentIndex}.${r.commandIndex} ${r.lifecycle.phase}`;
  if (key === last) continue;
  last = key;
  if (!c) continue;
  if (process.env.HPF1_EVENTS && !(globalThis as any).__seen?.has(segment)) {
    ((globalThis as any).__seen ??= new Set()).add(segment);
    for (const e of segment.events as any[]) console.log(`  event seq${e.sequence} ex${e.provenance?.instructionExecution ?? "-"} ${program.instructions[e.provenance?.programCounter]?.opcodeName ?? ""} ${e.payload?.kind}`);
  }
  const ev = (segment.events as any[]).find((e) => e.sequence === c.eventSequence);
  const op = ev?.provenance ? program.instructions[ev.provenance.programCounter]?.opcodeName : undefined;
  let extra = "";
  if (c.type === "hp") {
    const field = currentCommandField(r);
    const maxHp = field ? (field as any).battlers?.[c.battler]?.maxHP : undefined;
    extra = ` hp ${c.from}->${c.to} maxHP ${maxHp} bar ${maxHp ? battleHealthBarAnimationFrames({ maxHp, from: c.from, to: c.to }) : "?"}`;
  }
  console.log(`${advance.frame} ${r.segmentIndex}.${r.commandIndex} ${c.type} b${c.battler ?? "-"} seq${c.eventSequence} ex${ev?.provenance?.instructionExecution ?? "-"} ${op ?? ev?.payload?.kind ?? ""} ${JSON.stringify(c.timing ?? {})}${extra}`);
}
