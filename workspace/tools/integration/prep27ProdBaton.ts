// prep27: production per-frame timeline of a player-attacker Baton Pass (routes of prep11-routes.json), rendered through the real orchestrator + live renderer.
// node --experimental-strip-types tools/integration/prep27ProdBaton.ts [outFile]
// P = last frame of the body command (move-animation); k = frame - P.  Party screen: DOWN then A (cursor starts on the current slot), as forcedSwitchBatonPass.ts.
import { readFileSync, writeFileSync } from "node:fs";
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

const routes = JSON.parse(readFileSync("tools/integration/fixtures/prep11-routes.json", "utf8")).routes.BATON_PASS.slice(0, 2);
const MOVE = 226;
function run(seed: number, streak: number, moveIdx: number) {
  let state: any = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `prep27-baton-${seed}`, rngValue: seed, battleScene: "on", factoryWinStreak: streak, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
    rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
  }));
  let frame = 0, moveStart: number | null = null, P: number | null = null, bodyDuration: number | null | undefined, partyOpen: number | null = null, answered: number | null = null;
  const rows: any[] = []; const selLog: any[] = [];
  const step = (buttons: readonly GbaButton[] = []) => {
    if (++frame > 30000) throw new Error("budget");
    if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, new Set(buttons));
    else if (state.battleResolutionPresentation) state = advanceFactoryRoundBattleResolution(state, new Set(buttons));
    else if (state.battleCommandPresentation) state = advanceFactoryRoundBattleCommand(state, new Set(buttons));
    else throw new Error("lost battle ownership");
    const r = state.battleResolutionPresentation;
    const sel = state.battleForcedPartySelect;
    if (moveStart !== null && P !== null && sel && partyOpen === null) partyOpen = frame;
    if (sel && sel.sendOutElapsed !== null && answered === null) answered = frame;
    if (P !== null && frame - P < 700) selLog.push([frame - P, r?.lifecycle.phase ?? "-", sel ? [sel.elapsed, sel.sendOutElapsed, sel.submenuOpen ? 1 : 0, sel.cursor] : null, r ? `${r.segmentIndex}:${r.commandIndex}` : "-"]);
    if (!r) return;
    const cmd: any = r.segments[r.segmentIndex]?.commands[r.commandIndex];
    if (cmd?.type === "move-animation" && cmd.animation?.moveId === MOVE && moveStart === null) { moveStart = frame; bodyDuration = liveMoveAnimationDuration(cmd.animation); }
    if (moveStart === null) return;
    if (P === null && cmd && cmd.type !== "move-animation") P = frame - 1;
    if (P === null || !cmd) return;
    if (frame - P > 900) return;
    const v: any = createBattleResolutionPresentationRenderView(r);
    const fb = new Uint8Array(240 * 160 * 4);
    renderBattleResolutionLiveView(fb, v);
    const so = v.switchOut, mi = v.midBattleSwitchIn, si = v.switchIn;
    rows.push({ k: frame - P, seg: r.segmentIndex, ph: r.lifecycle.phase, sel: sel ? [sel.elapsed, sel.sendOutElapsed, sel.submenuOpen ? 1 : 0, sel.cursor] : null, cmd: cmd.type, el: r.lifecycle.phaseElapsed,
      vis: [v.visibility.player.sprite, v.visibility.player.healthbox, v.visibility.opponent.sprite, v.visibility.opponent.healthbox],
      out: so ? [so.elapsed, so.scale, so.y2, so.spriteVisible] : null,
      in: mi ? [mi.elapsed, mi.side, mi.ballVisible, mi.ballPose, mi.monVisible, mi.healthboxDx] : null,
      forced: si ? [si.elapsed, si.phase] : null, msg: v.message ? [v.message.lines.join("|"), v.message.visibleCharacters] : null,
      hash: createHash("sha256").update(fb).digest("hex").slice(0, 12) });
  };
  const phase = () => state.battleCommandPresentation?.lifecycle.phase;
  const until = (p: () => boolean) => { while (!p()) step((state.battleStartIntro && frame % 16 === 0) || (state.battleResolutionPresentation?.lifecycle.phase === "awaiting-message-dismiss" && frame % 2 === 0) ? ["A"] : []); };
  const pulse = (b: GbaButton) => { step(); step([b]); step(); };
  until(() => phase() === "action-menu");
  pulse("A"); until(() => phase() === "fight-menu");
  for (let i = 0; i < 4; i++) { const c = state.battleCommandPresentation!.fightCursor; if (c === moveIdx) break; pulse((c & 1) !== (moveIdx & 1) ? ((moveIdx & 1) ? "RIGHT" : "LEFT") : ((moveIdx & 2) ? "DOWN" : "UP")); }
  pulse("A");
  // advance to the party screen, then answer it and play through the replacement
  let guard = 0;
  while (guard++ < 2500) {
    const sel = state.battleForcedPartySelect;
    const keys = (sel && frame % 8 === 1) ? [sel.sendOutElapsed === null ? ((typeof sel.cursor === "number" ? !sel.party[sel.cursor]!.legal : (sel.cursor as string) === "onix") || sel.cursor === sel.current ? "DOWN" : "A") : "A"] : [];
    step(keys as any);
    if (P !== null && frame - P > 880) break;
  }
  return { moveStart, P, bodyDuration, partyOpen, answered, rows, selLog };
}
const out: any = {};
for (const r of routes) {
  const res = run(r.seed, r.streak, r.moves.indexOf(MOVE));
  out[`${r.seed}/${r.streak}`] = { species: r.species, moveStart: res.moveStart, P: res.P, bodyDuration: res.bodyDuration, partyOpenK: res.partyOpen === null ? null : res.partyOpen - res.P!, answeredK: res.answered === null ? null : res.answered - res.P!, rows: res.rows, selLog: res.selLog };
  const rr = res.rows; const first = (f: (x: any) => boolean) => rr.find(f)?.k ?? null;
  const segs: string[] = []; let key = "";
  for (const x of rr) { const kk = `${x.seg}:${x.cmd}`; if (kk !== key) { key = kk; segs.push(`${x.cmd}[seg${x.seg}]@k${x.k}`); } }
  console.log(r.seed, r.streak, r.species, "bodyDuration", res.bodyDuration, "P", res.P, "partyOpen k", out[`${r.seed}/${r.streak}`].partyOpenK, "answered k", out[`${r.seed}/${r.streak}`].answeredK);
  console.log("  commands:", segs.join(" > "));
  console.log("  boundaries (k): switch-out start", first((x) => x.cmd === "switch-out"), "| player sprite hidden", first((x) => x.vis[0] === false), "| player healthbox hidden", first((x) => x.vis[1] === false), "| switch-in start", first((x) => x.in !== null), "| ball visible", first((x) => x.in?.[2]), "| mon visible", first((x) => x.in?.[4]), "| first message after switch-out", first((x) => x.seg === 1 && x.cmd === "message"));
}
writeFileSync(process.argv[2] ?? "/tmp/p27/prodBaton.json", JSON.stringify(out));
// compact receipt (change points only; no per-frame rows): node ... prodBaton.ts <full.json> <receipt.json>
if (process.argv[3]) {
  const rec: any = {};
  for (const [k, v] of Object.entries<any>(out)) {
    const cp: any[] = []; let pk = "";
    for (const [kk, ph, sel, ci] of v.selLog) { const key = JSON.stringify([ph, ci, sel === null, sel && sel[1] === null, sel && sel[2]]); if (key !== pk) { pk = key; cp.push([kk, ph, ci, sel]); } }
    const cmds: any[] = []; let ck = "";
    for (const x of v.rows) { const key = `${x.seg}:${x.cmd}`; if (key !== ck) { ck = key; cmds.push([x.k, x.cmd, x.seg, x.hash]); } }
    const firstSendOut = v.rows.find((x: any) => x.cmd === "switch-out");
    rec[k] = { species: v.species, bodyDuration: v.bodyDuration, partyOpenK: v.partyOpenK, answeredK: v.answeredK, selectorChangePoints: cp, commandChangePoints: cmds,
      switchOutStartK: firstSendOut?.k ?? null, framebufferHashChain: createHash("sha256").update(v.rows.map((x: any) => x.hash).join(",")).digest("hex") };
  }
  writeFileSync(process.argv[3], JSON.stringify(rec, null, 1) + "\n");
}
