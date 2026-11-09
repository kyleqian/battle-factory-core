// sub260b: scan seeds x streaks for routes where the player's lead uses Substitute and its Toxic (92) then presents with the doll up.
// usage: npx tsx tools/integration/substituteToxicRouteScan.ts <shard> <shards> [seedMax=1000]
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { liveMoveAnimationDuration } from "../../src/engine/liveMoveAnimation.ts";
import { liveSubstituteSwapView } from "../../src/engine/liveSubstituteSwap.ts";
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";

const [shard, shards, seedMax] = [Number(process.argv[2] ?? 0), Number(process.argv[3] ?? 1), Number(process.argv[4] ?? 1000)];
const STREAKS = [0, 7, 14, 21, 28, 35, 42];
type Slot = 0 | 1 | 2 | 3;
for (let seed = shard; seed < seedMax; seed += shards) for (const streak of STREAKS) {
  let moves: number[];
  try {
    const r = generatedCommandAnimationReplay(seed, "off", [], streak, true, true);
    moves = [...(r.state.battle as any).rules.rulesContext.battlers[0].moves];
  } catch { continue; }
  const sub = moves.indexOf(164), tox = moves.indexOf(92);
  if (sub < 0 || tox < 0) continue;
  const others = ([0, 1, 2, 3] as Slot[]).filter((s) => s !== sub && s !== tox);
  const routes: Slot[][] = [[sub, tox], ...others.map((o) => [sub, o, tox]), ...others.map((o) => [sub, tox, o])];
  for (const route of routes) {
    let toxic: { doll: boolean; duration: number | null; kinds: string[]; bodyFirst?: number; bodyLast?: number; n: number } | null = null;
    try {
      const res = generatedCommandAnimationReplay(seed, "on", route, streak, true, true, (state) => {
        const r = state.battleResolutionPresentation;
        if (r?.lifecycle.phase !== "presenting" || toxic?.doll === false) return;
        const command = r.segments[r.segmentIndex]!.commands[r.commandIndex];
        if (command?.type !== "move-animation" || command.animation?.moveId !== 92 || command.animation.attacker !== 0) return;
        const view = createBattleResolutionPresentationRenderView(r);
        if (toxic === null) toxic = { doll: view.field.player.substituteDoll === true, duration: liveMoveAnimationDuration(command.animation, view.field), kinds: [], n: 0 };
        if (!toxic.doll) return;
        const swap = liveSubstituteSwapView(view);
        if (swap && !toxic.kinds.includes(swap.kind)) toxic.kinds.push(swap.kind);
        if (swap?.kind === "body") { const a = (swap.view.effect as { age: number }).age; toxic.bodyFirst ??= a; toxic.bodyLast = a; }
        toxic.n += 1;
      });
      const t = toxic as typeof toxic;
      if (process.env.SCAN_ALL || t?.doll) console.log(JSON.stringify({ seed, streak, moves, route, ...t, stalled: res.stalled, phase: res.state.battleCommandPresentation?.lifecycle.phase }));
    } catch (e) { /* route not completable */ }
  }
}
