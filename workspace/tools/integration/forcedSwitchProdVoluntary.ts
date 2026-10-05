// forced-switch: production's PLAYER-side switch-in timeline (the voluntary party-menu switch; the only route-driver path that reaches a player-side `switch-in` command),
// k=0 at the switch-in command start.  node --experimental-strip-types tools/integration/forcedSwitchProdVoluntary.ts [seed streak]
import {
  createFactoryRoundBattleOrchestrator, beginFactoryRoundBattleStartIntro, advanceFactoryRoundBattleStartIntro,
  advanceFactoryRoundBattleCommand, advanceFactoryRoundBattleResolution,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import type { GbaButton } from "../../src/input.ts";
const [seed, streak] = [Number(process.argv[2] ?? 42), Number(process.argv[3] ?? 0)];
let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
  id: `forced-switch-vol-${seed}`, rngValue: seed, battleScene: "on", factoryWinStreak: streak, playerTrainerId: 416049562,
  battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 }, rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
}));
let frame = 0, t0: number | null = null; const rows: any[] = [];
const step = (buttons: readonly GbaButton[] = []) => {
  frame += 1;
  if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, new Set(buttons));
  else if (state.battleResolutionPresentation) state = advanceFactoryRoundBattleResolution(state, new Set(buttons));
  else if (state.battleCommandPresentation) state = advanceFactoryRoundBattleCommand(state, new Set(buttons));
  const r = state.battleResolutionPresentation; if (r?.lifecycle.phase !== "presenting") return;
  const c: any = r.segments[r.segmentIndex]!.commands[r.commandIndex]; if (!c) return;
  if (t0 === null && c.type === "switch-in") t0 = frame;
  if (t0 === null || frame - t0 > 150) return;
  const v: any = createBattleResolutionPresentationRenderView(r); const mi = v.midBattleSwitchIn;
  rows.push([frame - t0, c.type, c.battler, mi && [mi.elapsed, mi.side, mi.ballVisible, mi.ballPose, mi.monVisible, mi.healthboxDx]]);
};
const phase = () => state.battleCommandPresentation?.lifecycle.phase;
const until = (p: () => boolean) => { while (!p()) { if (frame > 20000) throw new Error("budget"); step((state.battleStartIntro && frame % 16 === 0) || (state.battleResolutionPresentation?.lifecycle.phase === "awaiting-message-dismiss" && frame % 2 === 0) ? ["A"] : []); } };
const pulse = (b: GbaButton) => { step(); step([b]); step(); };
until(() => phase() === "action-menu");
pulse("DOWN"); pulse("A"); until(() => (state.battlePartySelect?.openElapsed ?? -1) >= 62);
while (state.battlePartySelect!.cursor !== 1) pulse("DOWN");
pulse("A"); pulse("A");
until(() => t0 !== null && frame - t0 > 150);
let prev = "";
for (const r of rows) { const key = JSON.stringify([r[1], r[3] && [r[3][1], r[3][2], r[3][3], r[3][4], r[3][5] !== null]]); if (key !== prev) { console.log(`+${r[0]}`, r[1], "battler", r[2], JSON.stringify(r[3])); prev = key; } }
