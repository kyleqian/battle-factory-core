// prep7: displayed field (full BattleResolutionDisplayedField entries, incl. status) at the Sleep Talk MOVE_ANIMATION event and at the called-move event, on the generated routes found by prep7SleepTalkScan.ts.
//   node --experimental-strip-types tools/integration/prep7SleepTalkField.ts > tools/integration/fixtures/prep7-sleep-talk-field.json
import { readFileSync } from "node:fs";
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { prep7Replay } from "./prep7Replay.ts";
const scan = JSON.parse(readFileSync("tools/integration/fixtures/prep7-sleep-talk-scan.json", "utf8"));
const out: any[] = [];
for (const h of scan.hits) {
  const rep = prep7Replay(h.seed, "on", [h.slotIndex, h.slotIndex, h.slotIndex], h.streak, true);
  const i = rep.requests.findIndex((q: any) => q.moveId === 214);
  const st = rep.commands.filter((c: any) => c.type === "move-animation").map((c: any) => ({ frame: c.frame, moveId: c.command.animation.moveId, attacker: c.command.animation.attacker }));
  // find the resolution state at the Sleep Talk command: replay again stopping is not exposed, so read the field recorded per request (extended below)
  out.push({ seed: h.seed, streak: h.streak, species: h.species, sleepTalkIndex: i, requestOrder: rep.requests.slice(0, i + 3).map((r: any) => ({ moveId: r.moveId, attacker: r.attacker, turn: r.turn, frame: r.frame })),
    sleepTalkField: (rep.requests[i] as any).field, calledMoveRequest: rep.requests[i + 1] && rep.requests[i + 1].attacker === 0 ? { moveId: rep.requests[i + 1].moveId, frame: rep.requests[i + 1].frame, gapFrames: rep.requests[i + 1].frame - rep.requests[i].frame } : null, moveAnimationCommands: st.slice(0, 6) });
}
console.log(JSON.stringify(out, null, 1));
