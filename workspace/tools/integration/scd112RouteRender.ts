// scd112 (S10A, ISSUES #166 slice d): production routes end to end through the app's render path. The orchestrator replay
// (generatedCommandAnimationReplay: legal generated rentals / opponent, ordinary command input) is stepped frame by frame and every
// presented frame is drawn as core.ts draws it (renderBattleResolutionPresentation with drawScene = renderBattleResolutionLiveView;
// no presentation-RNG host, identically in both trees). Per frame: the command key / type / age and the frame's sha256 (16 hex).
// Per stats-change command: battler, animArg, species, elevated opponent, Castform form, x2 input. Run the same routes in a base
// archive copy and in the final tree; scd112RouteDelta.py compares them. Read-only use of production; no oracle.
//   node --experimental-strip-types --no-warnings tools/integration/scd112RouteRender.ts --routes=0:2:on,3:3:off --out=f.json [--scan]
// `--scan` skips the frame renders (route search: stats-change commands only).
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";
import { battleResolutionFieldBeforeCommand, renderBattleResolutionPresentation } from "../../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import battleEnemyShadow from "../../src/assets/gen/battle-enemy-shadow.json" with { type: "json" };
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { statsChangeParams, statsChangeRow } from "../../src/animation/statsChange.ts";

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
  const statsChanges: Record<string, unknown>[] = [];
  let key = "";
  const fb = new Uint8Array(240 * 160 * 4);
  const replay = generatedCommandAnimationReplay(seed, scene, Array(8).fill(slot), 0, true, true, (state, frame) => {
    const r = state.battleResolutionPresentation;
    if (!r) return;
    const command = r.segments[r.segmentIndex]?.commands[r.commandIndex] as any;
    const k = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}:${r.lifecycle.phase}`;
    if (command?.type === "stats-change" && k !== key) {
      // The displayed field at the command's start (after the segment's earlier commands: e.g. the Intimidate user's switch-in).
      const segment = r.segments[r.segmentIndex]!;
      const field = battleResolutionFieldBeforeCommand(segment.field, segment.commands, r.commandIndex) as any;
      const mon = command.battler === 0 ? field.player : field.opponent;
      statsChanges.push({ frame, key: k, battler: command.battler, argument: command.argument, frames: command.timing.minimumFrames,
        species: speciesName(mon.species), elevatedOpponent: command.battler === 1 && elevated.has(`SPECIES_${speciesName(mon.species)}`),
        opponentSpecies: speciesName(field.opponent.species), opponentElevated: elevated.has(`SPECIES_${speciesName(field.opponent.species)}`),
        castformForms: r.liveCastformForms ?? null, x2Input: r.liveMoveBattlerX2Input ?? null,
        // The reducer's banner ages (command age a = rel a + 1) and shadow-hidden ages, for the delta check.
        bannerAges: Array.from({ length: command.timing.minimumFrames }, (_, a) => a)
          .filter((a) => statsChangeRow(statsChangeParams(command.argument)!, a + 1).bannerVisible),
        shadowHiddenAges: Array.from({ length: command.timing.minimumFrames }, (_, a) => a)
          .filter((a) => statsChangeRow(statsChangeParams(command.argument)!, a + 1).enemyShadowHidden).length });
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
  results.push({ seed, slot, scene, stalled: replay.stalled, lastFrame: replay.frame, presentedFrames: frames.length, statsChanges,
    ...(scan ? {} : { frames }) });
  console.log(seed, slot, scene, `frames ${replay.frame} presented ${frames.length} stats-change ${statsChanges.length}`,
    JSON.stringify(statsChanges.map((s) => [s.frame, s.battler, s.argument, s.species, s.elevatedOpponent ? "ELEV" : "", s.opponentSpecies])));
}
writeFileSync(out, JSON.stringify(results) + "\n");
