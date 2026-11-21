// flow1 (docs/flow1-menu-cursors-and-locked-switch-recall.md): two battle-flow fixes the frame catcher found on 2026-11-20.
//  1. The battle menus' cursors go back to the first entry after a switch-in (HandleAction_Switch battle_util.c:299-300,
//     SwitchInClearSetData battle_main.c:3203-3204, PlayerHandleSwitchInAnim battle_controller_player.c:2190-2191, Transform's
//     RESET_MOVE_SELECTION battle_script_commands.c:7802). Ours kept the old move cursor after a voluntary switch (seed 3: CHARMELEON's
//     move menu opened on the fourth move).
//  2. A voluntary switch while the foe is locked into a two-turn move (seed 6: the foe underground after Dig) prints the recall line
//     and recalls the mon (SE_BALL_OPEN). Ours started at "Go! VOLBEAT!". The same for the trainer's switch while the player is
//     locked (seed 18: "AROMA LADY ABBIE withdrew PIDGEOTTO!" was missing).
import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import { FactorySession } from "../src/factorySession.ts";
import type { GbaButton } from "../src/input.ts";
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import type { BattleKernelSemanticEvent, BattleState } from "../src/engine/battleDecisionBoundary.ts";
import {
  appendBattleResolutionActionContinuation,
  appendBattleResolutionLockedActionContinuation,
  createBattleResolutionPresentation,
  type BattleResolutionPresentationCommand,
  type BattleResolutionPresentationState,
} from "../src/engine/battleResolutionPresentation.ts";
import { createBattleResolutionPresentationRenderView } from "../src/engine/battleResolutionPresentationRender.ts";
import type { BattleScriptPartyMemberState, BattleScriptPartyState } from "../src/engine/battleScriptRulesContext.ts";
import {
  submitFactoryFullTurnDecision,
  type FactoryFullTurnDecisionRules,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { createFreshFactoryBattle } from "../src/engine/factoryBattleStart.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import {
  resetMoveSelectionCursorsForSwitchIns,
  type FactoryBattleMoveSelectionCursors,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import { SE_BALL_OPEN } from "../src/engine/screenSounds.ts";
import { ActionLog, RandomPlayer, Rng } from "../tools/soak/randomRoundSoakDriver.ts";

const FLY = 19;
const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

function member(setId: number): BattleScriptPartyMemberState {
  const set = frontierMonsData.entries[setId]!;
  return createFactoryCorpusPartyMember({ setId, personality: natureByName.get(set.nature)!, fixedIv: 3, abilitySlot: 0 });
}

function party(activeSetId: number): BattleScriptPartyState {
  return Object.freeze([member(activeSetId), member(300), member(301), member(302), member(303), member(304)]) as unknown as
    BattleScriptPartyState;
}

function commandRequest(state: BattleState<FactoryFullTurnDecisionRules>, side: "player" | "trainer") {
  if (state.boundary.kind !== "decision-required" || state.boundary.request.kind !== "command" || state.boundary.request.side !== side) {
    throw new Error(`expected a ${side} command boundary`);
  }
  return state.boundary.request;
}

type DecisionPick = (d: { kind: string; partyIndex?: number; moveSlot?: number }) => boolean;

function submit(state: BattleState<FactoryFullTurnDecisionRules>, side: "player" | "trainer", pick: DecisionPick) {
  const request = commandRequest(state, side);
  const decision = request.legalDecisions.find(pick);
  if (decision === undefined) throw new Error(`no legal ${side} decision`);
  const transition = submitFactoryFullTurnDecision(state, { requestId: request.requestId, side, decision });
  if (transition.kind !== "decision-required") throw new Error(`expected ${side} decision to reach a command boundary`);
  return Object.freeze({ request, decision, transition });
}

const firstMove = (d: { kind: string; moveSlot?: number }) => d.kind === "use-move" && d.moveSlot === 0;

/** The player's METAPOD hardens, the foe's TAILLOW flies up (a locked two-turn move), then the player's next command. */
function foeFlyThenPlayer(pick: (d: { kind: string; partyIndex?: number; moveSlot?: number }) => boolean) {
  const initial = createFreshFactoryBattle({ requestId: 1, rngSeed: 0, battleScene: "off", playerParty: party(8), opponentParty: party(44) });
  const player = submit(initial, "player", firstMove);
  const charge = submit(player.transition.state, "trainer", firstMove);
  const chargeResolution = createBattleResolutionPresentation({
    sourceRequest: player.request,
    sourceDecision: player.decision as never,
    beforeRules: initial.rules,
    transition: charge.transition,
    fieldBoundary: createBattleCommandPresentation(player.request, initial.rules.rulesContext, 0).field,
    confirmHandoff: { fightDisplayCursor: 0, idleBounceElapsed: 0 },
  });
  const completed: BattleResolutionPresentationState = Object.freeze({
    ...chargeResolution,
    commandIndex: chargeResolution.segments[0]!.commands.length,
    lifecycle: Object.freeze({ phase: "next-command-handoff" as const, phaseElapsed: 6 }),
    confirmHandoff: null,
  });
  const intervening = submit(charge.transition.state, "player", pick);
  const field = createBattleCommandPresentation(
    commandRequest(charge.transition.state, "player"),
    charge.transition.state.rules.rulesContext,
    0,
  ).field;
  return { completed, intervening, field };
}

const messageText = (command: BattleResolutionPresentationCommand | undefined): string =>
  command?.type === "message" ? command.lines.join(" ") : "";

describe("flow1: a voluntary switch while the foe is locked into a two-turn move", () => {
  it("prints the recall line and recalls the mon before the send-in, with the foe kept hidden", () => {
    const { completed, intervening, field } = foeFlyThenPlayer((d) => d.kind === "switch" && d.partyIndex === 1);
    const resolution = appendBattleResolutionLockedActionContinuation({
      resolution: completed,
      transition: intervening.transition,
      fieldBoundary: field,
      lockedAction: { battler: 1, currentMove: FLY, currentMovePosition: 0 },
      sourceDecision: intervening.decision as never,
    });
    const commands = resolution.segments[1]!.commands;
    // hpthresholds2: the foe took no damage since the last switch-in -> hpScale 0, "that's enough!".
    expect(commands[0]).toMatchObject({ type: "message" });
    expect(messageText(commands[0])).toMatch(/^METAPOD, that.s enough! Come back!$/);
    const recall = commands.findIndex((c) => c.type === "switch-out" && c.battler === 0);
    const goLine = commands.findIndex((c) => messageText(c).startsWith("Go! "));
    const sendIn = commands.findIndex((c) => c.type === "switch-in" && c.battler === 0);
    expect(recall).toBe(1);
    expect(commands[recall]).not.toHaveProperty("skipAnimation");
    expect(goLine).toBeGreaterThan(recall);
    expect(sendIn).toBeGreaterThan(goLine);
    expect(commands.some((c) => messageText(c) === "Foe TAILLOW used FLY!")).toBe(true);
    // The fresh switch's own clock: the party-menu close hold, then the recall line (no fight-menu confirm handoff).
    expect(resolution.sourceDecision).toMatchObject({ kind: "switch", partyIndex: 1 });
    expect(resolution.lifecycle).toEqual({ phase: "confirm-handoff", phaseElapsed: 0 });
    expect(resolution.confirmHandoff).toBeNull();
    expect(resolution.fadeTick).toBe(0);
    // The foe is still up in the sky (Scene OFF: hidden since the charge segment) during the recall.
    const recallView = createBattleResolutionPresentationRenderView(Object.freeze({
      ...resolution,
      commandIndex: recall,
      lifecycle: Object.freeze({ phase: "presenting" as const, phaseElapsed: 10 }),
    }));
    expect(recallView.visibility.opponent.sprite).toBe(false);
  });

  it("leaves a move at the same command as the kernel emits it", () => {
    const { completed, intervening, field } = foeFlyThenPlayer(firstMove);
    const resolution = appendBattleResolutionLockedActionContinuation({
      resolution: completed,
      transition: intervening.transition,
      fieldBoundary: field,
      lockedAction: { battler: 1, currentMove: FLY, currentMovePosition: 0 },
      sourceDecision: intervening.decision as never,
    });
    expect(resolution.segments[1]!.events).toBe(intervening.transition.events);
    expect(resolution.lifecycle.phase).toBe("presenting");
    expect(resolution.sourceDecision).toBe(completed.sourceDecision);
    expect(resolution.segments[1]!.commands.some((c) => /Come back!/.test(messageText(c)))).toBe(false);
  });
});

describe("flow1: the trainer's voluntary switch while the player is locked into a two-turn move", () => {
  it("prints the trainer's withdraw line and recalls the foe before its send-in", () => {
    // The player's TAILLOW flies up; at the locked strike turn only the trainer chooses, and it switches.
    const initial = createFreshFactoryBattle({ requestId: 1, rngSeed: 0, battleScene: "off", playerParty: party(44), opponentParty: party(8) });
    const player = submit(initial, "player", firstMove);
    const charge = submit(player.transition.state, "trainer", firstMove);
    const chargeResolution = createBattleResolutionPresentation({
      sourceRequest: player.request,
      sourceDecision: player.decision as never,
      beforeRules: initial.rules,
      transition: charge.transition,
      fieldBoundary: createBattleCommandPresentation(player.request, initial.rules.rulesContext, 0).field,
      confirmHandoff: { fightDisplayCursor: 0, idleBounceElapsed: 0 },
      opponentTrainer: { className: "AROMA LADY", name: "ABBIE", speechLose: ["", ""] },
    });
    const completed: BattleResolutionPresentationState = Object.freeze({
      ...chargeResolution,
      commandIndex: chargeResolution.segments[0]!.commands.length,
      lifecycle: Object.freeze({ phase: "next-command-handoff" as const, phaseElapsed: 6 }),
      confirmHandoff: null,
    });
    const switching = submit(charge.transition.state, "trainer", (d) => d.kind === "switch" && d.partyIndex === 1);
    const grouped = appendBattleResolutionActionContinuation({
      resolution: completed,
      transition: switching.transition,
      fieldBoundary: createBattleResolutionPresentationRenderView(completed).field,
    });
    const commands = grouped.segments[1]!.commands;
    const withdrew = commands.findIndex((c) => messageText(c) === "AROMA LADY ABBIE withdrew METAPOD!");
    const recall = commands.findIndex((c) => c.type === "switch-out" && c.battler === 1);
    const sentOut = commands.findIndex((c) => messageText(c).startsWith("AROMA LADY ABBIE sent out "));
    const lockedStrike = commands.findIndex((c) => messageText(c) === "TAILLOW used FLY!");
    expect(withdrew).toBe(0);
    expect(recall).toBeGreaterThan(withdrew);
    expect(sentOut).toBeGreaterThan(recall);
    expect(lockedStrike).toBeGreaterThan(sentOut);
  });
});

function cursors(...values: (0 | 1 | 2 | 3)[]): FactoryBattleMoveSelectionCursors {
  return Object.freeze(values) as unknown as FactoryBattleMoveSelectionCursors;
}

describe("flow1: the move cursor reset marks", () => {
  const battle = createFreshFactoryBattle({ requestId: 1, rngSeed: 0, battleScene: "off", playerParty: party(8), opponentParty: party(44) });
  const event = (payload: unknown, sequence = 1): BattleKernelSemanticEvent => Object.freeze({ sequence, payload }) as never;

  it("resets a battler's cursor on its switch-in animation even when the same party slot comes back", () => {
    const before = cursors(3, 2, 0, 0);
    expect(resetMoveSelectionCursorsForSwitchIns(before, battle, battle, [])).toBe(before);
    expect(resetMoveSelectionCursorsForSwitchIns(before, battle, battle, [
      event({ kind: "switch-in-animation", battler: 0, partyIndex: 1 }),
      event({ kind: "switch-in-animation", battler: 0, partyIndex: 0 }, 2),
    ])).toEqual([0, 2, 0, 0]);
  });

  it("resets the move cursor on Transform's RESET_MOVE_SELECTION", () => {
    expect(resetMoveSelectionCursorsForSwitchIns(cursors(3, 1, 0, 0), battle, battle, [
      event({ kind: "reset-action-move-selection", battler: 1, reset: "move-selection", command: 54, argument: 2 }),
    ])).toEqual([3, 0, 0, 0]);
  });
});

/** The frame catcher's trace seeds (tools/frame-catcher/makeTrace.mjs): the ROM runs of docs/flow1-... used these challenges. */
const mix = (x: number): number => {
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
};

function playCatcherSeed(seed: number, scene: "on" | "off", frames: number, onTick: (session: FactorySession, sounds: unknown[]) => void) {
  const session = new FactorySession({
    battleScene: scene, gameplaySeed: mix(seed * 2 + 1), presentationSeed: mix(seed * 2 + 2), start: "draft", challengeRequest: "hold",
  });
  let sounds: unknown[] = [];
  session.attachSoundSink({ push: (e: unknown) => { sounds.push(e); } } as never);
  const player = new RandomPlayer(new Rng(seed), new ActionLog(false), "full");
  for (let f = 0; f < frames; f += 1) {
    sounds = [];
    session.tick(player.decide(session.state) as ReadonlySet<GbaButton>);
    onTick(session, sounds);
  }
}

describe("flow1: whole challenges of the frame catcher's seeds", () => {
  // fop1 (a new challenge's first opponent is rolled in the ROM's order, so these seeds' challenges moved): seed 3 Scene ON now has 3
  // switch-in entries in its 34,800 frames; scanned catcher seeds 0..29 (same player, frames): 0 is the lowest with at least 5 checked
  // entries and 3 carried cursors (6 / 12), so it is pinned. Seed 6 Scene OFF no longer meets a foe underground; scanned seeds 0..199:
  // 135 is the lowest with at least 5 recalls of which exactly one is a continuation after the foe's Dig (6 recalls, battle 2's
  // PUPITAR), so it is pinned (seeds 86 and 142 recall after a Dig too, with other counts).
  // Merge of the box's 2026-11-20 run with the Mac's 11-21 fixes: seed 135's game moved (7 recalls; its one continuation is now
  // GRAVELER -> POLIWHIRL after a Rock Throw turn, no foe underground). Re-scanned seeds 0..199 (same player, 28,400 frames, the foe's
  // STATUS3_UNDERGROUND at the continuation segment's start and a "dug a hole" print before it): 163 is the lowest with at least 5
  // recalls of which exactly one is a continuation after the foe's Dig (5 recalls, battle 1's PUPITAR; also a hit in fop1's scan, at
  // frame 4073, now 4084), so it is pinned. 86 (3 continuations), 89 (4 recalls), 142 (3 recalls) and 193 (8 recalls, one Dig
  // continuation, VIBRAVA) recall after a Dig too.
  it("opens the action and move menus on the first entry after every switch-in (seed 0, Scene ON)", () => {
    let lastRequest: string | null = null;
    let switchedIn = false;
    const seenSegments = new Set<unknown>();
    let checked = 0;
    let carried = 0;
    playCatcherSeed(0, "on", 34_800, (session) => {
      const orch = session.state.factoryRoundBattleOrchestrator;
      if (!orch) return;
      for (const segment of orch.battleResolutionPresentation?.segments ?? []) {
        if (seenSegments.has(segment)) continue;
        seenSegments.add(segment);
        if (segment.commands.some((c) => c.type === "switch-in" && c.battler === 0)) switchedIn = true;
      }
      const cmd = orch.battleCommandPresentation;
      if (!cmd) return;
      const id = `${orch.round.rules.battleIndex}:${cmd.request.requestId}`;
      if (id === lastRequest) return;
      lastRequest = id;
      if (switchedIn) {
        expect({ id, action: cmd.actionCursor, fight: cmd.fightCursor }).toEqual({ id, action: 0, fight: 0 });
        checked += 1;
      } else if (cmd.fightCursor !== 0) carried += 1;
      switchedIn = false;
    });
    // Seed 3 before fop1: battles 1 and 2 held five voluntary switches (the first, ELEKID -> CHARMELEON, opened CHARMELEON's menu on the
    // fourth move) and two faint replacements. Seed 0 now: six entries after a switch-in, twelve carried cursors over turns without one.
    expect(checked).toBeGreaterThanOrEqual(5);
    expect(carried).toBeGreaterThanOrEqual(3);
  });

  it("recalls the player's mon with its line and SE_BALL_OPEN when the foe is underground after Dig (seed 163, Scene OFF)", () => {
    let partyOpen = false;
    const recalls: { frame: number; lines: string[]; continuation: boolean; ballOpenAfterLine: boolean }[] = [];
    let watching: { frame: number; lines: string[]; continuation: boolean; ballOpenAfterLine: boolean } | null = null;
    playCatcherSeed(163, "off", 28_400, (session, sounds) => {
      const orch = session.state.factoryRoundBattleOrchestrator;
      const res = orch?.battleResolutionPresentation ?? null;
      if (partyOpen && res !== null && orch?.battleCommandPresentation === null) {
        // the party menu's SHIFT started this resolution's newest segment: a voluntary switch
        const segment = res.segments[res.segmentIndex]!;
        const lines = segment.commands.filter((c) => c.type === "message").map(messageText);
        watching = { frame: session.frame, lines, continuation: res.segmentIndex > 0, ballOpenAfterLine: false };
        recalls.push(watching);
      }
      partyOpen = orch?.battleCommandPresentation?.lifecycle.phase === "party-handoff";
      if (watching !== null && res !== null && res.lifecycle.phase === "presenting") {
        const command = res.segments[res.segmentIndex]!.commands[res.commandIndex];
        if (command?.type === "switch-out" && sounds.some((e) => (e as { kind: string; id: number }).kind === "se"
          && (e as { id: number }).id === SE_BALL_OPEN)) watching.ballOpenAfterLine = true;
        if (command?.type === "switch-in") watching = null;
      }
    });
    expect(recalls.length).toBeGreaterThanOrEqual(5);
    for (const recall of recalls) {
      expect(recall.lines[0], `switch at ${recall.frame}`).toMatch(/[Cc]ome back!$/);
      expect(recall.lines[1], `switch at ${recall.frame}`).toMatch(/!$/);
      expect(recall.ballOpenAfterLine, `switch at ${recall.frame}`).toBe(true);
    }
    // The ROM-checked case (seed 6's before fop1 was GROWLITHE -> VOLBEAT while AZUMARILL was underground,
    // docs/flow1-menu-cursors-and-locked-switch-recall.md): POLIWHIRL -> GRAVELER while battle 2's PUPITAR is underground (a locked
    // continuation of the Dig charge's resolution). The frame catcher over this seed's trace (makeTrace --seed 135 --scene off --policy
    // full --battles 2, docs/fop1-first-opponent-order.md) shows the ROM print the same two lines with PUPITAR hidden, same sounds.
    // Seed 163 (the merge re-pin above): ONIX -> GROWLITHE while battle 1's PUPITAR is underground (ONIX's Dragonbreath missed it first).
    // The frame catcher over its trace (makeTrace --seed 163 --scene off --policy full --battles 2; 89 / 89 menus, 0 sound differences in the
    // run) shows the ROM print "ONIX, come back!", the recall, "Go! GROWLITHE!" and "Foe PUPITAR used DIG!" with PUPITAR hidden, as ours
    // (engine 4100-4300, ROM 4371-4571); that stretch has the same 12 sound events (timing shifts -7 .. +2 frames).
    const underground = recalls.filter((r) => r.continuation);
    expect(underground.map((r) => r.lines.slice(0, 2))).toEqual([["ONIX, come back!", "Go! GROWLITHE!"]]);
  });
});
