// pfr185: production timing of a PLAYER faint-replacement send-in on generated-rental routes (the real kernel + projectBattleResolutionCommands
// + orchestrator, either scene; the replacement answered with DOWN / A / A like a player).  Per replacement, frames counted from the SEND OUT
// confirm (the first `presenting-switch-in` frame = party select sendOutElapsed 0): the phase boundaries and the action menu's first frame.
//   node --experimental-strip-types --no-warnings tools/integration/pfr185Prod.ts <out.json> <seed,seed,...> [on|off|both]
import { writeFileSync } from "node:fs";
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";

const [outPath, seedArg, sceneArg] = process.argv.slice(2);
const scenes = sceneArg === undefined || sceneArg === "both" ? (["off", "on"] as const) : [sceneArg as "on" | "off"];
const rows: any[] = [];
for (const scene of scenes) {
  for (const seed of seedArg!.split(",").map(Number)) {
    let fainted = false; let last = ""; let confirm: number | null = null; let species: string | null = null;
    const phases: Record<string, number> = {};
    try {
      generatedCommandAnimationReplay(seed, scene, Array(10).fill(0) as never, 0, true, true, (state, frame) => {
        const r = state.battleResolutionPresentation; const bc = state.battleCommandPresentation;
        if (r && r.lifecycle.phase === "presenting") {
          const c: any = r.segments[r.segmentIndex]!.commands[r.commandIndex];
          if (c?.type === "faint" && c.battler === 0) fainted = true;
        }
        if (!fainted) return;
        const key = r ? `${r.lifecycle.phase}:${r.segments[r.segmentIndex]!.commands[r.commandIndex]?.type}` : `command:${bc?.lifecycle.phase}`;
        if (key === last) return;
        last = key;
        if (r?.lifecycle.phase === "presenting-switch-in" && confirm === null) {
          confirm = frame;
          const sel: any = state.battleForcedPartySelect;
          species = sel?.request?.battler !== undefined ? String(sel.request.battler) : null;
        }
        if (confirm !== null) phases[key] ??= frame - confirm;
        if (bc?.lifecycle.phase === "action-menu") throw new Error("done");
      });
    } catch { /* "done", a stalled budget, or the battle ending */ }
    if (confirm === null) continue;
    const row = { scene, seed, confirmFrame: confirm, phasesFromConfirm: phases, actionMenuFromConfirm: phases["command:action-menu"] ?? null };
    rows.push(row);
    console.log(scene, seed, JSON.stringify(phases));
  }
}
writeFileSync(outPath!, JSON.stringify(rows, null, 1) + "\n");
