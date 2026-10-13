// sar131 (S10A, ISSUES #168 slice SA4; scd112RouteRender.ts pattern): production routes end to end through the app's render path.
// The orchestrator replay (generatedCommandAnimationReplay: legal generated rentals / opponent, ordinary command input) is stepped
// frame by frame and every presented frame is drawn as core.ts draws it (renderBattleResolutionPresentation with drawScene =
// renderBattleResolutionLiveView; no presentation-RNG host, identically in both trees). Per frame: the command key / type / age and
// the frame's sha256 (16 hex); per move-animation command its battler x2 input; per status-animation command: battler, animation,
// species, elevated opponent, x2 input, the previous message (path). Run the same routes in a base archive copy and in the final
// tree; sar131RouteDelta.py compares them. Read-only use of production; no oracle.
//   node --experimental-strip-types --no-warnings tools/integration/sar131RouteRender.ts --routes=7:0:on,11:1:on --out=f.json [--scan]
// `--scan` skips the frame renders (route search: status-animation commands only).
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";
import { battleResolutionFieldBeforeCommand, renderBattleResolutionPresentation } from "../../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import battleEnemyShadow from "../../src/assets/gen/battle-enemy-shadow.json" with { type: "json" };
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const scan = process.argv.includes("--scan");
const out = arg("out")!;
const routes = arg("routes")!.split(",").map((r) => {
  const [seed, slot, scene] = r.split(":") as [string, string, "on" | "off"];
  return { seed: Number(seed), slot: Number(slot) as 0 | 1 | 2 | 3, scene };
});
const elevated = new Set(battleEnemyShadow.elevatedSpecies);
const speciesName = (id: number) => speciesStats.species.find((s) => s.id === id)?.name.replace(/^SPECIES_/, "") ?? String(id);

const results = [];
for (const { seed, slot, scene } of routes) {
  const frames: [number, string, string, number, string][] = []; // [frame, command key, type, age, sha]
  const statusAnimations: Record<string, unknown>[] = [];
  const bodies: Record<string, unknown>[] = [];
  let key = "";
  let lastMessage = "";
  const fb = new Uint8Array(240 * 160 * 4);
  const replay = generatedCommandAnimationReplay(seed, scene, Array(8).fill(slot), 0, true, true, (state, frame) => {
    const r = state.battleResolutionPresentation;
    if (!r) return;
    const command = r.segments[r.segmentIndex]?.commands[r.commandIndex] as any;
    const k = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}:${r.lifecycle.phase}`;
    if (k !== key && command?.type === "message") lastMessage = command.lines.join(" ");
    if (k !== key && command?.type === "move-animation" && command.animation) {
      bodies.push({ frame, key: k, moveId: command.animation.moveId, attacker: command.animation.attacker, x2Input: r.liveMoveBattlerX2Input ?? null });
    }
    if (command?.type === "status-animation" && k !== key) {
      const segment = r.segments[r.segmentIndex]!;
      const field = battleResolutionFieldBeforeCommand(segment.field, segment.commands, r.commandIndex) as any;
      const mon = command.battler === 0 ? field.player : field.opponent;
      statusAnimations.push({ frame, key: k, battler: command.battler, animation: command.animation, frames: command.timing.minimumFrames,
        species: speciesName(mon.species), opponentSpecies: speciesName(field.opponent.species),
        opponentElevated: elevated.has(`SPECIES_${speciesName(field.opponent.species)}`), x2Input: r.liveMoveBattlerX2Input ?? null,
        previousMessage: lastMessage });
    }
    key = k;
    let sha = "";
    if (!scan) {
      fb.fill(0);
      renderBattleResolutionPresentation(fb, r, { drawScene: renderBattleResolutionLiveView }, null);
      sha = createHash("sha256").update(fb).digest("hex").slice(0, 16);
    }
    frames.push([frame, k, command?.type ?? "none", r.lifecycle.phaseElapsed, sha]);
  });
  results.push({ seed, slot, scene, stalled: replay.stalled, lastFrame: replay.frame, presentedFrames: frames.length, statusAnimations, bodies,
    ...(scan ? {} : { frames }) });
  console.log(seed, slot, scene, `frames ${replay.frame} presented ${frames.length} status-animation ${statusAnimations.length}`,
    JSON.stringify(statusAnimations.map((s) => [s.frame, s.battler, s.animation, s.species, s.opponentElevated ? "ELEV" : "", String(s.previousMessage).slice(0, 30)])));
}
writeFileSync(out, JSON.stringify(results) + "\n");
