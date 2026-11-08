// land75: the routes hist73 turns exact — liveWallMoveAdapters.test.ts seeds 10 / 260 (slot 0, streak 0) and playableAnimationIntegration's
// Light Screen seed 84 (slots [3, 3]) — through the PRODUCTION orchestrator (generatedCommandAnimationReplay's onFrame observer): at every
// row of the wall body (Barrier 112 / Magic Coat 277 / Light Screen 113) the
// render view's hidden sides (liveMoveHiddenSides), the effect's allocator / order inputs and whether the live adapter is active. The
// dense ROM comparison of the same body histories is fixtures/land75/check-*.json (audit18Check.ts on the land75 lab fixtures).
//   node --experimental-strip-types --no-warnings tools/integration/land75RouteCheck.ts [--out=file.json]
import { writeFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { liveMoveAnimationPresentation, liveMoveHiddenSides } from "../../src/engine/liveMoveAnimation.ts";
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";

const out = process.argv.find((a) => a.startsWith("--out="))?.slice(6);
const routes = [{ seed: 10, moveId: 112, slots: [0] }, { seed: 260, moveId: 277, slots: [0] }, { seed: 84, moveId: 113, slots: [3, 3] }] as const;
const result = routes.map(({ seed, moveId, slots }) => {
  const rows: { age: number; hidden: unknown; allocatorKnown: boolean; orderInput: boolean; live: boolean }[] = [];
  const replay = generatedCommandAnimationReplay(seed, "on", slots, 0, false, false, (state) => {
    const r = state.battleResolutionPresentation;
    if (r?.lifecycle.phase !== "presenting") return;
    const command = r.segments[r.segmentIndex]!.commands[r.commandIndex];
    if (command?.type !== "move-animation" || command.animation?.moveId !== moveId) return;
    const view = createBattleResolutionPresentationRenderView(r);
    if (view.effect?.type !== "move") return;
    const e = view.effect;
    rows.push({ age: e.age, hidden: liveMoveHiddenSides(view.visibility, e.request), allocatorKnown: e.spriteAllocatorInput?.historyKnown === true,
      orderInput: e.spriteOrderInput !== undefined,
      live: liveMoveAnimationPresentation(e.request, view.field, e.age, e.paletteInput, e.spriteAllocatorInput, e.spriteOrderInput) !== null });
  });
  const index = replay.requests.findIndex((q) => q.moveId === moveId);
  const history = replay.requests.slice(0, index + 1).map((q) => `${q.moveId}${q.turn & 1 ? "t1" : ""}@${q.attacker}`);
  const distinct = [...new Set(rows.map((x) => JSON.stringify({ hidden: x.hidden, allocatorKnown: x.allocatorKnown, orderInput: x.orderInput, live: x.live })))];
  return { seed, moveId, history, field: replay.animations.find((a) => a.moveId === moveId) && {
    player: replay.animations.find((a) => a.moveId === moveId)!.player, opponent: replay.animations.find((a) => a.moveId === moveId)!.opponent },
  rows: rows.length, ages: [rows[0]?.age, rows.at(-1)?.age], distinct: distinct.map((x) => JSON.parse(x)) };
});
const text = `${JSON.stringify({ schema: "land75-wall-route-check/v1", routes: result }, null, 1)}\n`;
if (out) writeFileSync(out, text);
process.stdout.write(text);
