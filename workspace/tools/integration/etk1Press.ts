// etk1: the engine's frame of the first accepted press at the end-turn "fainted!" box of a lab (the lab stage throws when the forced party menu opens, the frame after the press is taken).
//   node --experimental-strip-types --no-warnings tools/integration/etk1Press.ts <lab-name> [--scene on|off]
// Prints the engine's message commands (frame, ids) and, from a lab that presses A every 30 frames, the frame the dismiss completes (the throw).
import "../../src/engine/monPicPixelsInstall.ts";
import { readFileSync } from "node:fs";
import { createInitialState, tick } from "../../src/engine/core.ts";
import { traceAdvances } from "../compare/traceReplay.ts";

const [arg, ...flags] = process.argv.slice(2) as string[];
const name = arg!.split("/").pop()!.replace(/\.json$/, "");
const sceneFlag = flags.indexOf("--scene") >= 0 ? flags[flags.indexOf("--scene") + 1] : undefined;
const lab = JSON.parse(readFileSync(new URL(`../battle-lab/${name}.json`, import.meta.url), "utf8"));
const scene: "on" | "off" = (sceneFlag as "on" | "off" | undefined) ?? (lab.profile === "battle-scene-on" ? "on" : "off");
const { labBackedStage } = (await import("../compare/appTrace.ts")) as any;
let state: any = labBackedStage(`${name}.json`, createInitialState({ appRoute: "generated-orchestrator", battleScene: scene }), undefined, scene);
const presses: number[] = [];
let lastKey = "";
for (const advance of traceAdvances(lab.trace.segments)) {
  if (advance.buttons.length > 0 && advance.buttons.includes("A")) presses.push(state.frame + 1);
  try { state = tick(state, advance.buttons); } catch (e: any) { console.log(`throw at frame ${state.frame + 1}: ${String(e.message).slice(0, 80)}`); break; }
  const res: any = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
  const seg = res?.segments?.[res.segmentIndex]; const cmd = seg?.commands?.[res.commandIndex];
  const key = cmd === undefined ? "" : `${res.segmentIndex}.${res.commandIndex}.${res.lifecycle?.phase}`;
  if (key !== lastKey) {
    lastKey = key;
    if (cmd !== undefined && cmd.type === "message") {
      const payload = seg.events.find((e: any) => e.sequence === cmd.eventSequence)?.payload;
      console.log(`frame ${state.frame} ${key} ${payload?.messageId} ${JSON.stringify(cmd.timing)}`);
    } else if (cmd !== undefined) console.log(`frame ${state.frame} ${key} ${cmd.type}`);
  }
}
console.log("A presses (frames):", presses.filter((f) => f > 0).join(" "));
