// prep11 X-SWITCH: the presentation command sequence the ordinary route produces after the Roar / Whirlwind / Baton Pass MOVE_ANIMATION request
// (what production would present for the forced-switch continuation). node --experimental-strip-types tools/integration/prep11XSwitchCommands.ts
import { readFileSync } from "node:fs";
import { prep7Replay } from "./prep7Replay.ts";
const routes = JSON.parse(readFileSync("tools/integration/fixtures/prep11-routes.json", "utf8")).routes;
for (const [m, id] of [["ROAR", 46], ["WHIRLWIND", 18], ["BATON_PASS", 226]] as const) for (const r of routes[m].slice(0, 2)) {
  const idx = r.moves.indexOf(id);
  try {
    const rep: any = prep7Replay(r.seed, "on", [idx], r.streak, true);
    const cmds = rep.commands as { type: string; frame: number; command: any }[];
    const at = cmds.findIndex(c => c.type === "move-animation" && c.command.animation?.moveId === id);
    console.log(m, r.seed, r.streak, r.species, "move-animation command index", at, "of", cmds.length);
    console.log("  ", cmds.slice(Math.max(0, at - 1), at + 9).map(c => `${c.type}@${c.frame}${c.command.animation ? `[${c.command.animation.moveId}]` : ""}`).join(" > "));
    const ev = (rep.semanticEvents as any[]).map(e => e.event.kind ?? e.event.type).filter(Boolean);
    const k = ev.findIndex((x: string) => x === "animation");
    console.log("   semantic kinds around the move:", ev.slice(Math.max(0, k - 2), k + 12).join(","));
  } catch (e) { console.log(m, r.seed, "ERR", String(e).slice(0, 120)); }
}
