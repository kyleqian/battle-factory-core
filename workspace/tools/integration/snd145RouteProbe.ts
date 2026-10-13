// snd145 (docs/snd145-send-in-tail-live.md): on real production routes (generatedCommandAnimationReplay: legal generated rentals /
// opponent, ordinary command input), every OPPONENT switch-in command: species, path (faint replacement = a faint of battler 1 earlier
// in the segment; otherwise forced / voluntary), its duration, and the frames from its elapsed 0 to (a) the next command and (b) the
// first frame of the following battle command presentation (the "What will X do?" action prompt) when the resolution ends after it.
// The ROM's faint-replacement message box blanks at duration + 10 and the action menu draws at + 17 (dense Scene ON windows); with
// --bands the probe renders every frame (resolution: renderBattleResolutionPresentation + renderBattleResolutionLiveView, as core.ts;
// command presentation: renderGeneratedBattleCommandPresentation) and lists the message-box band (y >= 112) changes after the
// switch-in's elapsed 0. Read-only use of production; no oracle.
//   node --experimental-strip-types --no-warnings tools/integration/snd145RouteProbe.ts --seeds=0:20 [--scene=on|off] [--out=f.json]
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";
import { renderBattleResolutionPresentation } from "../../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView, renderGeneratedBattleCommandPresentation } from "../../src/engine/battleScene.ts";

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const [s0, s1] = (arg("seeds") ?? "0:10").split(":").map(Number) as [number, number];
const scene = (arg("scene") ?? "on") as "on" | "off";
const bands = process.argv.includes("--bands");
const rows: Record<string, unknown>[] = [];
const fb = new Uint8Array(240 * 160 * 4);
const bandHash = () => createHash("sha256").update(fb.subarray(112 * 240 * 4)).digest("hex").slice(0, 8);
for (let seed = s0; seed < s1; seed += 1) {
  let open: { species: number; path: string; duration: number; start: number; nextCommand: number | null; key: string } | null = null;
  let afterSwitchKey: string | null = null;
  let bandStart: number | null = null; let lastBand = ""; let bandChanges: [number, string][] = [];
  const flush = (prompt: number | null) => {
    if (open) rows.push({ seed, species: open.species, path: open.path, duration: open.duration,
      nextCommand: open.nextCommand, prompt: prompt === null ? null : prompt - open.start });
    open = null;
  };
  try {
    generatedCommandAnimationReplay(seed, scene, Array(8).fill(Number(arg("slot") ?? 0) as 0 | 1 | 2 | 3), 0, true, true, (state, frame) => {
      const r = state.battleResolutionPresentation;
      if (bands && bandStart !== null && frame - bandStart <= 300) {
        fb.fill(0);
        if (r) renderBattleResolutionPresentation(fb, r, { drawScene: renderBattleResolutionLiveView }, null);
        else if (state.battleCommandPresentation && !state.battlePartySelect) renderGeneratedBattleCommandPresentation(fb, state.battleCommandPresentation, "all");
        const h = bandHash();
        if (h !== lastBand) { bandChanges.push([frame - bandStart, h]); lastBand = h; }
        const dump = arg("dump-band");
        if (dump !== undefined && bandChanges.length <= 4) writeFileSync(`${dump}-${seed}-${frame - bandStart}.rgba`, fb);
        if (frame - bandStart === 300) { rows.push({ seed, bands: bandChanges }); bandStart = null; }
      }
      if (!r) {
        if (open && state.battleCommandPresentation) flush(frame);
        return;
      }
      if (r.lifecycle.phase !== "presenting") return;
      const segment = r.segments[r.segmentIndex]!;
      const command = segment.commands[r.commandIndex] as any;
      const key = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`;
      if (command?.type === "switch-in" && command.battler === 1 && r.lifecycle.phaseElapsed === 0) {
        if (open) flush(null);
        const fainted = segment.commands.slice(0, r.commandIndex).some((c: any) => c.type === "faint" && c.battler === 1);
        if (bandStart === null) { bandStart = frame; lastBand = ""; bandChanges = []; }
        open = { species: command.incoming.species, path: fainted ? "faint" : "switch", key,
          duration: command.timing.minimumFrames + (command.settleHoldFrames ?? 0), start: frame, nextCommand: null };
        afterSwitchKey = key;
        return;
      }
      if (open && afterSwitchKey !== null && key !== afterSwitchKey && open.nextCommand === null) {
        open.nextCommand = frame - open.start;
        (open as any).nextType = command?.type;
        rows.push({ seed, note: "next", type: command?.type, at: frame - open.start, lines: command?.lines });
        afterSwitchKey = null;
      }
    });
  } catch (error) {
    rows.push({ seed, error: String(error).slice(0, 120) });
  }
  flush(null);
}
for (const row of rows) console.log(JSON.stringify(row));
if (arg("out")) writeFileSync(arg("out")!, JSON.stringify(rows, null, 1) + "\n");
