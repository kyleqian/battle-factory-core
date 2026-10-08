// S10A Substitute: ordinary generated-rental routes where rentals[0] uses Substitute (164) on turn 1, then the given slots.
// Prints the move-animation requests and whether the subbed battler is shown as the doll when the next prompt opens.
//   npx vite-node tools/integration/substRouteScan.ts <seed> <streak> <slot> [<slot>...]
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";

const [seed, streak, ...slots] = process.argv.slice(2).map(Number) as [number, number, ...(0 | 1 | 2 | 3)[]];
const dolls: string[] = [];
let last = "";
const scene = process.env.SCENE === "off" ? "off" : "on";
const run = generatedCommandAnimationReplay(seed, scene, slots, streak, true, true, (state) => {
  const r = state.battleResolutionPresentation;
  const f = r ? createBattleResolutionPresentationRenderView(r).field : state.battleCommandPresentation?.field;
  if (!f) return;
  const k = `${f.player.substituteDoll ? "P" : "-"}${f.opponent.substituteDoll ? "O" : "-"}`;
  if (k !== last) { dolls.push(`${k}@${r ? `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}:${r.lifecycle.phase}` : "prompt"}`); last = k; }
});
console.log(JSON.stringify({ seed, streak, slots, stalled: run.stalled, prompt: run.state.battleCommandPresentation?.lifecycle.phase,
  requests: run.requests.map((q) => `${q.moveId}:${q.attacker}->${q.target}`),
  commands: run.commands.map((c) => c.type === "move-animation" ? `anim(${(c.command as { animation?: { moveId: number } }).animation?.moveId ?? "-"})` : c.type === "message" && (c.command as { substituteFadeBattler?: number }).substituteFadeBattler !== undefined ? "FADE-msg" : c.type).join(" "),
  dolls }));
