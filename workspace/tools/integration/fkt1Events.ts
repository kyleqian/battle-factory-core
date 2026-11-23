// fkt1: dump the faint segment's commands and kernel events (kind, script label) of a battle lab, to see which script produced the zero-HP damage.
//   node --experimental-strip-types --no-warnings tools/integration/fkt1Events.ts <lab-name> [--scene on|off]
import "../../src/engine/monPicPixelsInstall.ts";
import { readFileSync } from "node:fs";
import { createInitialState, tick } from "../../src/engine/core.ts";
import { traceAdvances } from "../compare/traceReplay.ts";

const [arg, ...flags] = process.argv.slice(2) as [string, ...string[]];
const name = arg.split("/").pop()!.replace(/\.json$/, "");
const sceneFlag = flags.indexOf("--scene") >= 0 ? flags[flags.indexOf("--scene") + 1] : undefined;
const lab = JSON.parse(readFileSync(new URL(`../battle-lab/${name}.json`, import.meta.url), "utf8"));
const scene: "on" | "off" = (sceneFlag as "on" | "off" | undefined) ?? (lab.profile === "battle-scene-on" ? "on" : "off");
const { labBackedStage } = (await import("../compare/appTrace.ts")) as any;
let state: any = labBackedStage(`${name}.json`, createInitialState({ appRoute: "generated-orchestrator", battleScene: scene }), undefined, scene, true);
const seen = new Set<string>();
for (const advance of traceAdvances(lab.trace.segments)) {
  state = tick(state, advance.buttons);
  const res: any = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
  const segment = res?.segments?.[res.segmentIndex];
  if (segment === undefined || !segment.commands.some((c: any) => c.type === "faint")) continue;
  const key = `${res.segmentIndex}:${segment.events.length}`;
  if (seen.has(key)) continue;
  seen.add(key);
  console.log(`segment ${res.segmentIndex} hitMarker ${segment.beforeRules.rulesContext.hitMarker}`);
  console.log(segment.commands.map((c: any, i: number) => `${i}:${c.type}${c.battler ?? ""}`).join(" "));
  for (const e of segment.events) console.log(e.sequence, e.payload.kind, e.payload.animationId ?? e.payload.messageId ?? "", e.provenance?.sourceLabel ?? "", e.provenance?.instructionExecution ?? "");
}
