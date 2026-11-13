// obr251 probe: per-frame presentation command timeline of the aud241b opponent-faint stage (A press at 501).
import "../../src/engine/monPicPixelsInstall.ts"; // iss215: standalone node run must install the sprite pixel provider (bnd257d)
import { createInitialState, tick } from "../../src/engine/core.ts";
import { APP_STAGES } from "../compare/appTrace.ts";
import { traceAdvances } from "../compare/traceReplay.ts";

const scene = process.argv[2] ?? "on";
const from = Number(process.argv[3] ?? 495), to = Number(process.argv[4] ?? 700);
let state = createInitialState({ appRoute: "generated-orchestrator" });
state = APP_STAGES[`aud241b-opponent-faint-${scene}`]!(state);
const segments = [{ frames: 2, buttons: ["A"] }, { frames: 18, buttons: [] }, { frames: 2, buttons: ["A"] }, { frames: 478, buttons: [] }, { frames: 2, buttons: ["A"] }, { frames: 298, buttons: [] }];
let prev = "";
for (const adv of traceAdvances(segments as never)) {
  state = tick(state, adv.buttons as never);
  if (adv.frame < from || adv.frame > to) continue;
  const r = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
  if (!r) { console.log(adv.frame, "no resolution"); continue; }
  const seg = r.segments[r.segmentIndex]!;
  const c = seg.commands[r.commandIndex];
  const d = c === undefined ? "end" : `${c.type}${c.type === "party-summary" ? JSON.stringify((c as any).states) : ""}${"visible" in c ? `(${(c as any).battler}:${(c as any).visible})` : ""}${"battler" in c && c.type !== "party-summary" ? `(${(c as any).battler})` : ""}`;
  const key = `${r.segmentIndex}/${r.commandIndex}/${d}/${r.lifecycle.phase}`;
  if (key !== prev) console.log(adv.frame, key, "elapsed", r.lifecycle.phaseElapsed);
  prev = key;
}
