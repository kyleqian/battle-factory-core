// S10A Substitute, DEFENDER shown as the doll: the first ordinary generated-rental routes (r3ProfileRouteSearch recipe: rentals[0]
// knows Substitute, seeds ascending, streak 0..42 step 7; turn 1 = Substitute, then Substitute again (fails, no body) while the
// opponent's move hits the doll) whose opponent body is a proven defender-doll cell (LIVE_SUBSTITUTE_DOLL_DEFENDER_CELLS) and whose
// next prompt still shows the doll. Never picks by live output (gameplay state only).
//   node --experimental-strip-types --no-warnings tools/integration/dolldefRouteScan.ts [maxHits] [maxSeed]
import { generateInitialFactoryRentals } from "../../src/engine/factoryRentalGeneration.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { LIVE_SUBSTITUTE_DOLL_DEFENDER_CELLS } from "../../src/engine/liveMoveAnimation.ts";
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";

const maxHits = Number(process.argv[2] ?? 2);
const maxSeed = Number(process.argv[3] ?? 400);
let hits = 0;
for (let seed = 0; seed < maxSeed && hits < maxHits; seed++) for (let streak = 0; streak <= 42 && hits < maxHits; streak += 7) {
  const g = generateInitialFactoryRentals({ rngValue: seed, factoryWinStreak: streak, rentsCount: 0, playerTrainerId: 416049562 });
  const m = createFactoryCorpusPartyMember(g.rentals[0]!) as { moves: readonly number[] };
  const slot = m.moves.indexOf(164) as 0 | 1 | 2 | 3 | -1;
  if (slot < 0) continue;
  const bodies = new Set<string>();
  let run;
  try {
    run = generatedCommandAnimationReplay(seed, "on", [slot, slot], streak, true, true, (state) => {
      const r = state.battleResolutionPresentation;
      if (r?.lifecycle.phase !== "presenting") return;
      const command = r.segments[r.segmentIndex]!.commands[r.commandIndex];
      if (command?.type !== "move-animation" || !command.animation) return;
      const a = command.animation, f = createBattleResolutionPresentationRenderView(r).field;
      if (a.target === a.attacker || (a.target === 0 ? f.player : f.opponent).substituteDoll !== true) return;
      const cell = (LIVE_SUBSTITUTE_DOLL_DEFENDER_CELLS.get(a.moveId) ?? []).includes(a.attacker === 0 ? "player" : "opponent");
      bodies.add(`${a.moveId}:${a.attacker}->${a.target}${cell ? ":cell" : ""}`);
    });
  } catch (e) { console.log(JSON.stringify({ seed, streak, error: String(e).slice(0, 120) })); continue; }
  const prompt = run.state.battleCommandPresentation;
  const ok = [...bodies].some((b) => b.endsWith(":cell")) && prompt?.lifecycle.phase === "action-menu" && prompt.field.player.substituteDoll === true;
  console.log(JSON.stringify({ seed, streak, slot, species: g.rentals[0]!.speciesName, stalled: run.stalled, prompt: prompt?.lifecycle.phase,
    playerDoll: prompt?.field.player.substituteDoll === true, bodies: [...bodies], ok }));
  if (ok) hits++;
}
