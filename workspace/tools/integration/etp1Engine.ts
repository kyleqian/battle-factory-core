// etp1: the engine's presentation commands of a battle lab with the message id, script label and instruction execution of each command's event.
//   node --experimental-strip-types --no-warnings tools/integration/etp1Engine.ts <lab-name> <out.json> [--scene on|off]
// Output: { cmds: [frame, type, messageId|null, sourceLabel|null, instructionExecution|null, minimumFrames, holdFrames][] } in presentation order (frame = the first frame the command shows).
import "../../src/engine/monPicPixelsInstall.ts";
import { readFileSync, writeFileSync } from "node:fs";
import { createInitialState, tick } from "../../src/engine/core.ts";
import { traceAdvances } from "../compare/traceReplay.ts";

const [arg, out, ...flags] = process.argv.slice(2) as [string, string, ...string[]];
const name = arg.split("/").pop()!.replace(/\.json$/, "");
const sceneFlag = flags.indexOf("--scene") >= 0 ? flags[flags.indexOf("--scene") + 1] : undefined;
const lab = JSON.parse(readFileSync(new URL(`../battle-lab/${name}.json`, import.meta.url), "utf8"));
const scene: "on" | "off" = (sceneFlag as "on" | "off" | undefined) ?? (lab.profile === "battle-scene-on" ? "on" : "off");
const { labBackedStage } = (await import("../compare/appTrace.ts")) as any;
let state: any = labBackedStage(`${name}.json`, createInitialState({ appRoute: "generated-orchestrator", battleScene: scene }), undefined, scene);
const cmds: unknown[][] = [];
let last = "";
const frames = lab.trace.segments.reduce((n: number, s: any) => n + s.frames, 0);
for (const advance of traceAdvances(lab.trace.segments)) {
  if (advance.frame > frames) break;
  state = tick(state, advance.buttons);
  const res: any = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
  const seg = res?.segments?.[res.segmentIndex];
  const cmd = seg?.commands?.[res.commandIndex];
  const key = cmd === undefined || res.lifecycle?.phase !== "presenting" ? "" : `${res.segmentIndex}.${res.commandIndex}`;
  if (key !== last) {
    last = key;
    if (key !== "") {
      const ev = seg.events.find((e: any) => e.sequence === cmd.eventSequence);
      cmds.push([state.frame + (cmd.type === "message" ? cmd.leadFrames ?? 0 : 0), cmd.type, ev?.payload?.messageId ?? cmd.messageId ?? null, ev?.provenance?.sourceLabel ?? null, ev?.provenance?.instructionExecution ?? null, cmd.timing?.minimumFrames ?? null, cmd.timing?.holdFrames ?? null, ev?.payload?.animationId ?? ev?.payload?.statusAnimationId ?? null]);
    }
  }
}
writeFileSync(out, JSON.stringify({ cmds }));
