// forced-switch: where production stops after a Baton Pass body, and what a presented replacement looks like once the party screen is answered.
// node --experimental-strip-types tools/integration/forcedSwitchBatonPass.ts
import { readFileSync } from "node:fs";
import { prep7Replay } from "./prep7Replay.ts";
import { advanceFactoryRoundBattleResolution, advanceFactoryRoundBattleCommand } from "../../src/engine/factoryRoundBattleOrchestrator.ts";
const routes = JSON.parse(readFileSync("tools/integration/fixtures/prep11-routes.json", "utf8")).routes;
for (const r of routes.BATON_PASS.slice(0, 2)) {
  const rep: any = prep7Replay(r.seed, "on", [r.moves.indexOf(226)], r.streak, true);
  let state: any = rep.state;
  const res = state.battleResolutionPresentation;
  console.log("BATON_PASS", r.seed, r.streak, r.species, "stalled", rep.stalled, "resolution phase", res?.lifecycle.phase, "forcedRequest", JSON.stringify(res?.forcedRequest)?.slice(0, 160), "forcedPartySelect", state.battleForcedPartySelect ? "present" : "null");
  const cmds = rep.commands.map((c: any) => `${c.type}@${c.frame}`);
  console.log("  commands up to the stall:", cmds.slice(-6).join(" > "));
  // answer the forced party screen: A until the continuation starts, record commands that follow
  const seen: string[] = []; let key = "";
  for (let i = 0; i < 1500; i += 1) {
    const sel = state.battleForcedPartySelect;
    const keys = new Set(i % 8 === 1 ? (sel && sel.sendOutElapsed === null ? [(typeof sel.cursor === "number" ? sel.cursor === "cancel" || !sel.party[sel.cursor]!.legal : (sel.cursor as string) === "onix") ? "DOWN" : "A"] : ["A"]) : []) as any; // cursor starts on the current slot: DOWN to a legal pick, then A (send-out confirm)
    try { state = state.battleResolutionPresentation ? advanceFactoryRoundBattleResolution(state, keys) : advanceFactoryRoundBattleCommand(state, keys); } catch (e) { console.log("  stop:", String(e).slice(0, 100)); break; }
    if (i % 150 === 0) { const f = state.battleForcedPartySelect; console.log("   tick", i, f ? JSON.stringify({ open: f.openElapsed, cursor: f.cursor, send: f.sendOutElapsed, keys: Object.keys(f).slice(0, 14) }) : "no selector"); }
    const q = state.battleResolutionPresentation; if (!q) { if (key !== "none") { key = "none"; seen.push(`(no resolution; command presentation ${state.battleCommandPresentation?.lifecycle.phase})@${i}`); } continue; }
    const c = q.segments[q.segmentIndex]?.commands[q.commandIndex];
    const k = `${q.lifecycle.phase}:${q.segmentIndex}:${q.commandIndex}`; if (k !== key) { key = k; seen.push(`${q.lifecycle.phase}/${c?.type ?? "-"}[seg${q.segmentIndex}]@${i}`); }
  }
  console.log("  after answering the party screen:", seen.join(" > "));
}
