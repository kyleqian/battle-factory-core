// hpf3: per presented command of an audio fixture's replay trace (tools/audio/fixtures/*.json): start frame, type, opcode, instructionExecution, hp bar frames.
//   node --experimental-strip-types --no-warnings tools/integration/hpf3Cmds.ts <fixture.json> [maxFrame]
import { readFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import { createInitialState, tick } from "../../src/engine/core.ts";
import { loadBattleScriptProgram } from "../../src/engine/battleScriptProgram.ts";
import { APP_STAGES } from "../compare/appTrace.ts";
import { traceAdvances } from "../compare/traceReplay.ts";

const [path, maxArg] = process.argv.slice(2) as [string, string | undefined];
const trace = JSON.parse(readFileSync(path, "utf8")).trace;
const maxFrame = maxArg === undefined ? 1e9 : Number(maxArg);
const program = loadBattleScriptProgram();
let state: any = createInitialState({ appRoute: trace.route, battleScene: trace.battleScene });
if (trace.appStage && trace.appStage.frame === 0) state = APP_STAGES[trace.appStage.id]!(state);
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
  const ev = (segment.events as any[]).find((e) => e.sequence === c.eventSequence);
  const op = ev?.provenance ? program.instructions[ev.provenance.programCounter]?.opcodeName : undefined;
  const hp = c.type === "hp" ? ` hp ${c.from}->${c.to}` : "";
  console.log(`${advance.frame} ${r.segmentIndex}.${r.commandIndex} ${c.type} b${c.battler ?? "-"} ex${ev?.provenance?.instructionExecution ?? "-"} ${op ?? ev?.payload?.kind ?? ""} ${JSON.stringify(c.timing ?? {})}${hp}`);
}
