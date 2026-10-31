// inv142 (S10A, ISSUES #168 follow-up; docs/inv142-status-animation-invisible-battler.md): EXPOSURE of Scene ON status-animation
// commands whose battler's displayed sprite is INVISIBLE in production at the command (sar131's statusAnimationRenderView guard draws
// nothing there). The battles are sa125LiveShareCensus.ts's exactly (same orchestrator options, driver, --index-from shards). At the first
// presented frame of every `status-animation` command: createBattleResolutionPresentationRenderView's visibility[side].sprite, the doll,
// and the cause split into the two production contributors -- (a) a completed `sprite-visibility` receipt (CONTROLLER_SPRITEINVISIBILITY,
// Cmd_moveend's semi-invulnerable toggle) and (b) applyLiveSemiInvulnerableCommand's live-body hide -- plus the move whose body hid it
// (the battler's last move-animation command before), the path (previous / next message) and whether a renderer case exists
// (statusAnimationRenderView with the visibility forced on). Read-only use of production; no oracle.
//   node --experimental-strip-types --no-warnings tools/integration/inv142Exposure.ts --seeds=0..99 --index-from=0 --out=e0.json
import { writeFileSync } from "node:fs";
import {
  createFactoryRoundBattleOrchestrator, beginFactoryRoundBattleStartIntro,
  advanceFactoryRoundBattleStartIntro, advanceFactoryRoundBattleCommand,
  advanceFactoryRoundBattleResolution,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import {
  applyLiveSemiInvulnerableCommand, createBattleResolutionPresentationRenderView, liveMoveRandom2PlanContextAt,
} from "../../src/engine/battleResolutionPresentationRender.ts";
import { createPresentationRngSession } from "../../src/engine/presentationRngHost.ts";
import { tickLiveMovePresentationRngSession } from "../../src/engine/liveMovePresentationRng.ts";
import { statusAnimationRenderView } from "../../src/engine/battleScene.ts";
import { PARTY_LIST_INPUT_ELAPSED } from "../../src/engine/partySelect.ts";
import type { GbaButton } from "../../src/input.ts";
import movesJson from "../../src/data/gen/moves.json" with { type: "json" };

const arg = (name: string, fallback?: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const [fromSeed, toSeed] = arg("seeds", "0..9")!.split("..").map(Number) as [number, number];
const streakMul = 11, indexFrom = Number(arg("index-from", "0"));
const FRAME_BUDGET = 200000;
const nameOf = new Map((movesJson as unknown as { moves: { id: number; name: string }[] }).moves.map((m) => [m.id, m.name]));

const rows: Record<string, unknown>[] = [];
let statusAnimationCommands = 0;
const battles: { battle: number; seed: number; streak: number; frames: number; end: string }[] = [];

function playBattle(battle: number, seed: number, streak: number): void {
  let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `live-share-census-${seed}-${streak}`, rngValue: seed, battleScene: "on",
    factoryWinStreak: streak, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
    rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
  }));
  let rng = createPresentationRngSession();
  let frame = 0, ended = false, commandKey = "";
  const slotUses = [0, 0, 0, 0];
  // Per battler: the last move-animation command (move, key) and the last completed messages, across resolutions.
  const lastBody: [string | null, string | null] = [null, null];
  const lastHider: [string | null, string | null] = [null, null];
  let lastMessages: string[] = [];
  const owned = () => Boolean(state.battleStartIntro || state.battleResolutionPresentation || state.battleCommandPresentation);
  const observe = () => {
    const r = state.battleResolutionPresentation;
    if (r?.lifecycle.phase !== "presenting") return;
    const segment = r.segments[r.segmentIndex]!;
    const command = segment.commands[r.commandIndex] as any;
    const key = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`;
    if (key === commandKey) return;
    commandKey = key;
    if (command?.type === "message") lastMessages = [...lastMessages.slice(-2), command.lines.join(" ")];
    if (command?.type === "move-animation" && command.animation) {
      const a = command.animation.attacker as 0 | 1;
      lastBody[a] = nameOf.get(command.animation.moveId) ?? `#${command.animation.moveId}`;
    }
    if (command?.type === "sprite-visibility" && !command.visible) lastHider[command.battler as 0 | 1] = `sprite-visibility after ${lastBody[command.battler as 0 | 1]}`;
    if (command?.type !== "status-animation") return;
    statusAnimationCommands++;
    const view = createBattleResolutionPresentationRenderView(r, rng.host);
    const b = command.battler as 0 | 1, side = b === 0 ? "player" : "opponent";
    if (view.visibility[side].sprite && view.field[side].substituteDoll !== true) return;
    // The two production contributors: sprite-visibility receipts (resolution-local, completed segments + this segment's earlier
    // commands) and the semi-invulnerable live-body hide (carried state + the same commands).
    let receiptVisible = true;
    let semi = r.liveSemiInvulnerableHidden ?? [false, false];
    const earlier = [...r.segments.slice(0, r.segmentIndex).flatMap((s) => s.commands), ...segment.commands.slice(0, r.commandIndex)] as any[];
    for (const c of earlier) {
      semi = applyLiveSemiInvulnerableCommand(semi as never, c);
      if (c.type === "sprite-visibility" && c.battler === b) receiptVisible = c.visible;
      if (c.type === "switch-in" && c.battler === b) receiptVisible = true;
    }
    const forced = statusAnimationRenderView({ ...view, visibility: { ...view.visibility, [side]: { ...view.visibility[side], sprite: true } } } as never);
    const next = segment.commands.slice(r.commandIndex + 1).find((c: any) => c.type === "message") as any;
    rows.push({
      battle, seed, streak, key, battler: b, side, animation: command.animation, minimumFrames: command.timing.minimumFrames,
      seGateFrames: command.timing.seGateFrames ?? 0, species: view.field[side].name, doll: view.field[side].substituteDoll === true,
      spriteVisible: view.visibility[side].sprite, cause: { spriteVisibilityReceipt: !receiptVisible, semiInvulnerableBodyHide: semi[b] === true },
      hiddenBy: lastBody[b], hider: lastHider[b], previousMessages: lastMessages, nextMessage: next ? next.lines.join(" ") : null,
      wouldDraw: forced !== null, spritesAtAge0: forced?.sprites.length ?? null,
    });
  };
  const step = (buttons: readonly GbaButton[] = []) => {
    if (++frame > FRAME_BUDGET) throw new Error("frame budget");
    if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, new Set(buttons));
    else if (state.battleResolutionPresentation) state = advanceFactoryRoundBattleResolution(state, new Set(buttons));
    else if (state.battleCommandPresentation) state = advanceFactoryRoundBattleCommand(state, new Set(buttons));
    rng = tickLiveMovePresentationRngSession(rng, state, liveMoveRandom2PlanContextAt);
    observe();
    if (!owned()) ended = true;
  };
  const phase = () => state.battleCommandPresentation?.lifecycle.phase;
  const pulse = (button: GbaButton) => { step(); if (!ended) step([button]); if (!ended) step(); };
  const forcedSelector = () => {
    const selector = state.battleForcedPartySelect;
    return selector && selector.sendOutElapsed === null && selector.elapsed >= PARTY_LIST_INPUT_ELAPSED ? selector : null;
  };
  const until = (predicate: () => boolean) => {
    while (!ended && !predicate()) {
      const selector = forcedSelector();
      if (selector) {
        pulse(selector.message !== null ? "A" : (!selector.submenuOpen && (typeof selector.cursor === "number" ? !selector.party[selector.cursor]!.legal : (selector.cursor as string) !== "magby")) ? "DOWN" : "A");
        continue;
      }
      step((state.battleStartIntro && frame % 16 === 0)
        || (state.battleResolutionPresentation?.lifecycle.phase === "awaiting-message-dismiss" && frame % 2 === 0) ? ["A"] : []);
    }
  };
  let end = "terminal";
  try {
    until(() => phase() === "action-menu");
    while (!ended) {
      pulse("A");
      until(() => phase() === "fight-menu");
      if (ended) break;
      const menu = state.battleCommandPresentation!;
      const legal = ([0, 1, 2, 3] as const).filter((s) => menu.legalMoveBySlot[s] !== null);
      const slot = legal.length === 0 ? 0 : legal.reduce((best, s) => (slotUses[s]! < slotUses[best]! ? s : best), legal[0]!);
      slotUses[slot]!++;
      for (let i = 0; i < 4; i++) {
        const cursor = state.battleCommandPresentation!.fightCursor;
        if (cursor === slot) break;
        pulse((cursor & 1) !== (slot & 1) ? ((slot & 1) ? "RIGHT" : "LEFT") : ((slot & 2) ? "DOWN" : "UP"));
      }
      pulse("A");
      until(() => !state.battleCommandPresentation);
      until(() => phase() === "action-menu");
    }
  } catch (e) {
    end = String(e).includes("frame budget") ? "stalled" : "error";
  }
  battles.push({ battle, seed, streak, frames: frame, end });
}

for (let i = indexFrom, seed = fromSeed; seed <= toSeed; i++, seed++) playBattle(i, seed, (i * streakMul) % 49);
writeFileSync(arg("out")!, JSON.stringify({ schema: "inv142-exposure/v1", seeds: `${fromSeed}..${toSeed}`, indexFrom,
  statusAnimationCommands, invisible: rows, battles }, null, 1) + "\n");
process.stderr.write(`done ${fromSeed}..${toSeed}: ${statusAnimationCommands} status-animation commands, ${rows.length} invisible / doll\n`);
