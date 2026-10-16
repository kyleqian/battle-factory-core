// pfr185: production timing of a PLAYER faint-replacement send-in on generated-rental routes (the real kernel +
// projectBattleResolutionCommands + orchestrator, either scene; the replacement answered with DOWN / A / A like a player).
// Per replacement: S = the frame the faint-replacement `switch-in` command (battler 0, preceded by the same segment's player `faint`)
// starts; the command list that follows; A = the first frame the action menu is drawn (battleCommandPresentation phase "action-menu").
// Both are production frames counted from S, i.e. the same origin snd182 uses for the forced path (command duration == ROM next text).
//   node --experimental-strip-types --no-warnings tools/integration/pfr185Prod.ts <out.json> <seedFrom> <seedTo> [on|off|both]
import { writeFileSync } from "node:fs";
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";

const [outPath, from, to, sceneArg] = process.argv.slice(2);
const scenes = sceneArg === undefined || sceneArg === "both" ? (["off", "on"] as const) : [sceneArg as "on" | "off"];
const rows: unknown[] = [];
for (const scene of scenes) {
  for (let seed = Number(from); seed <= Number(to); seed += 1) {
    let fainted = false; let S: number | null = null; let key = ""; let A: number | null = null; let info: any = null; let firstAfter: string[] = [];
    try {
      generatedCommandAnimationReplay(seed, scene, Array(10).fill(0) as never, 0, true, true, (state, frame) => {
        const r = state.battleResolutionPresentation;
        if (S === null && r && r.lifecycle.phase === "presenting") {
          const seg = r.segments[r.segmentIndex]!;
          const cmd: any = seg.commands[r.commandIndex];
          if (cmd?.type === "faint" && cmd.battler === 0) fainted = true;
          if (cmd?.type === "switch-in" && cmd.battler === 0 && fainted) {
            S = frame; key = `${r.segmentIndex}:${r.commandIndex}`;
            info = { species: cmd.incoming.species, name: cmd.incoming.name, personality: cmd.incoming.personality, timing: cmd.timing, settleHoldFrames: cmd.settleHoldFrames,
              healthboxSlideElapsed: cmd.healthboxSlideElapsed ?? null, sendInVisualDelay: cmd.sendInVisualDelay ?? null,
              following: seg.commands.slice(r.commandIndex + 1).map((c: any) => `${c.type}:${c.timing?.minimumFrames ?? ""}`) };
          }
        }
        if (S !== null && A === null && state.battleCommandPresentation && state.battleCommandPresentation.lifecycle.phase === "action-menu") A = frame;
        if (S !== null && A !== null) throw new Error("done");
      });
    } catch { /* "done", a stalled budget, or the battle ending: S / A already recorded */ }
    if (S !== null) rows.push({ scene, seed, S, A, actionMenuFromS: A === null ? null : A - S, ...info });
    if (S !== null) console.log(scene, seed, info.name, `S ${S} action-menu ${A === null ? "-" : A - S} following ${info.following.join(",")}`);
  }
}
writeFileSync(outPath!, JSON.stringify(rows, null, 1) + "\n");
