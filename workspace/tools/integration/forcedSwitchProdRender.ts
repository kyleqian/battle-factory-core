// forced-switch: production per-frame render of the Roar / Whirlwind forced-switch continuation (player attacker routes of prep11-routes.json).
// node --experimental-strip-types tools/integration/forcedSwitchProdRender.ts [outDir]    -> <outDir>/<MOVE>-<seed>-<streak>.json (compact: per-frame view summary + sha256 of the live-rendered framebuffer)
// E (production) = the frame the move-animation command ends (= first frame of the following switch-out command). Frames are relative to E.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  createFactoryRoundBattleOrchestrator, beginFactoryRoundBattleStartIntro,
  advanceFactoryRoundBattleStartIntro, advanceFactoryRoundBattleCommand,
  advanceFactoryRoundBattleResolution,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveMoveAnimationDuration } from "../../src/engine/liveMoveAnimation.ts";
import type { GbaButton } from "../../src/input.ts";

const out = process.argv[2] ?? "tools/integration/fixtures/forced-switch/prod";
mkdirSync(out, { recursive: true });
const routes = JSON.parse(readFileSync("tools/integration/fixtures/prep11-routes.json", "utf8")).routes;
const WINDOW = 190;

function run(seed: number, streak: number, moveIdx: number, moveId: number) {
  let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `forced-switch-${seed}`, rngValue: seed, battleScene: "on", factoryWinStreak: streak, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
    rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
  }));
  let frame = 0, E: number | null = null, moveStart: number | null = null;
  const rows: any[] = [];
  let bodyDuration: number | null | undefined;
  const step = (buttons: readonly GbaButton[] = []) => {
    if (++frame > 30000) throw new Error("budget");
    if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, new Set(buttons));
    else if (state.battleResolutionPresentation) state = advanceFactoryRoundBattleResolution(state, new Set(buttons));
    else if (state.battleCommandPresentation) state = advanceFactoryRoundBattleCommand(state, new Set(buttons));
    else throw new Error("lost battle ownership");
    const r = state.battleResolutionPresentation;
    if (r?.lifecycle.phase !== "presenting") return;
    const cmd: any = r.segments[r.segmentIndex]!.commands[r.commandIndex];
    if (!cmd) return;
    if (cmd.type === "move-animation" && cmd.animation?.moveId === moveId) { if (moveStart === null) { moveStart = frame; bodyDuration = liveMoveAnimationDuration(cmd.animation); } return; }
    if (moveStart === null) return;
    if (E === null && cmd.type === "switch-out") E = frame;
    if (E === null) return;
    const k = frame - E;
    if (k > WINDOW) return;
    const v: any = createBattleResolutionPresentationRenderView(r);
    const fb = new Uint8Array(240 * 160 * 4);
    renderBattleResolutionLiveView(fb, v);
    const so = v.switchOut, mi = v.midBattleSwitchIn, pt = v.midBattleSwitchParticles, si = v.switchIn;
    rows.push({ k, cmd: cmd.type, el: r.lifecycle.phaseElapsed,
      vis: [v.visibility.player.sprite, v.visibility.player.healthbox, v.visibility.opponent.sprite, v.visibility.opponent.healthbox],
      out: so ? [so.elapsed, so.scale, so.y2, so.spriteVisible] : null,
      in: mi ? [mi.elapsed, mi.side, mi.ballVisible, mi.ballPose, mi.monVisible, mi.emergeAccumulator, mi.healthboxDx] : null,
      forced: si ? [si.elapsed, si.phase] : null,
      particles: pt ? [pt.window, pt.schedules.length] : null,
      opp: v.field.opponent.name, player: v.field.player.name,
      msg: v.message ? [v.message.lines.join("|"), v.message.visibleCharacters] : null,
      hash: createHash("sha256").update(fb).digest("hex").slice(0, 12) });
  };
  const phase = () => state.battleCommandPresentation?.lifecycle.phase;
  const until = (p: () => boolean) => { while (!p()) step((state.battleStartIntro && frame % 16 === 0) || (state.battleResolutionPresentation?.lifecycle.phase === "awaiting-message-dismiss" && frame % 2 === 0) ? ["A"] : []); };
  const pulse = (b: GbaButton) => { step(); step([b]); step(); };
  until(() => phase() === "action-menu");
  pulse("A"); until(() => phase() === "fight-menu");
  for (let i = 0; i < 4; i++) { const c = state.battleCommandPresentation!.fightCursor; if (c === moveIdx) break; pulse((c & 1) !== (moveIdx & 1) ? ((moveIdx & 1) ? "RIGHT" : "LEFT") : ((moveIdx & 2) ? "DOWN" : "UP")); }
  pulse("A");
  try { until(() => E !== null && frame - E > WINDOW); } catch (e) { /* stall at a party screen is fine once the window is captured */ }
  return { moveStart, E, bodyDuration, rows };
}
for (const [name, id] of [["ROAR", 46], ["WHIRLWIND", 18]] as const) for (const r of routes[name].slice(0, 2)) {
  const res = run(r.seed, r.streak, r.moves.indexOf(id), id);
  writeFileSync(`${out}/${name}-${r.seed}-${r.streak}.json`, JSON.stringify({ move: name, seed: r.seed, streak: r.streak, species: r.species, ...res }));
  console.log(name, r.seed, r.streak, "moveStart", res.moveStart, "E", res.E, "liveBodyDuration", res.bodyDuration, "rows", res.rows.length);
}
