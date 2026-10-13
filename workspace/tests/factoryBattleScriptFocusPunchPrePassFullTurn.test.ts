/**
 * ISSUES #139 (fpp150) -- CheckFocusPunch_ClearVarsBeforeTurnStarts
 * (battle_main.c:4906-4923): every battler whose banked chosen move is Focus
 * Punch, and that is not asleep / Truant-loafing, runs
 * BattleScript_FocusPunchSetUp (battle_scripts_1.s:3709-3715) in battler-index
 * order after turn order is fixed and before action 1. No RNG (rcp143 R4).
 */
import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "../src/engine/battleScriptSourceConstants.ts";

const FOCUS_PUNCH = 264;
const TACKLE = 33;
const SPLASH = 150;
const ABILITY_TRUANT = 54;

type Side = Readonly<{ moves: readonly [number, number, number, number]; speed: number; status1?: number; ability?: number }>;

function config(player: Side, trainer: Side): FactoryFullTurnConfig {
  const battler = (side: Side, species: number) => ({
    species,
    moveId: side.moves[0],
    moves: side.moves,
    pp: [20, 20, 0, 0] as const,
    attack: 60,
    defense: 200,
    spAttack: 60,
    spDefense: 200,
    speed: side.speed,
    hp: 900,
    maxHp: 900,
    ...(side.status1 === undefined ? {} : { status1: side.status1 }),
    ...(side.ability === undefined ? {} : { ability: side.ability }),
  });
  return { requestId: 1, rngSeed: 0x1234, player: battler(player, 286), trainer: battler(trainer, 135) };
}

type State = Parameters<typeof submitFactoryFullTurnDecision>[0];
type Turn = Extract<ReturnType<typeof submitFactoryFullTurnDecision>, { kind: "decision-required" }>;

/** The request's own legal use-move decision for this slot (the target follows the move's target class). */
function use(state: State, moveSlot: 0 | 1) {
  const boundary = state.boundary as { kind: string; request?: { requestId: number; legalDecisions: readonly { kind: string; moveSlot?: number }[] } };
  const decision = boundary.request?.legalDecisions.find((legal) => legal.kind === "use-move" && legal.moveSlot === moveSlot);
  if (!boundary.request || !decision) throw new Error(`slot ${moveSlot} is not a legal use-move`);
  return { requestId: boundary.request.requestId, decision: decision as never };
}

function runTurn(state: State, playerSlot: 0 | 1, trainerSlot: 0 | 1): Turn {
  const afterPlayer = submitFactoryFullTurnDecision(state, { side: "player", ...use(state, playerSlot) });
  if (afterPlayer.kind !== "decision-required") throw new Error("expected the trainer command");
  const done = submitFactoryFullTurnDecision(afterPlayer.state, { side: "trainer", ...use(afterPlayer.state, trainerSlot) });
  if (done.kind !== "decision-required") throw new Error(`expected the next turn, got ${done.kind}`);
  return done;
}

/** Messages / animations in order, tagged with the source script. */
function trail(turn: Turn): string[] {
  const out: string[] = [];
  for (const event of turn.events as readonly { payload: { kind: string }; provenance?: { sourceLabel?: string } }[]) {
    const payload = event.payload as { kind: string; messageId?: string; animationId?: string; battler?: number; actionSnapshot?: { attacker: number } };
    const label = event.provenance?.sourceLabel === "BattleScript_FocusPunchSetUp" ? "FP:" : "";
    if (payload.kind === "message") {
      out.push(`${label}${payload.messageId}${payload.messageId === "STRINGID_PKMNTIGHTENINGFOCUS" ? `@${payload.actionSnapshot?.attacker}` : ""}`);
    } else if (payload.kind === "animation") {
      out.push(`${label}anim ${payload.animationId}@${payload.battler}`);
    }
  }
  return out;
}

const PRE_PASS = (battler: 0 | 1) => [
  "FP:STRINGID_EMPTYSTRING3",
  `FP:anim FOCUS_PUNCH_SETUP@${battler}`,
  `FP:STRINGID_PKMNTIGHTENINGFOCUS@${battler}`,
];

function sceneOff(state: ReturnType<typeof createFactoryFullTurnBattleState>): ReturnType<typeof createFactoryFullTurnBattleState> {
  const rulesContext = { ...state.rules.rulesContext, hitMarker: (state.rules.rulesContext.hitMarker | BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) >>> 0 };
  return { ...state, rules: { ...state.rules, rulesContext } } as typeof state;
}

describe("fpp150 -- Focus Punch pre-pass (ISSUES #139)", () => {
  it("a slower player Focus Punch user tightens its focus before the faster foe acts", () => {
    const turn = runTurn(createFactoryFullTurnBattleState(config(
      { moves: [TACKLE, FOCUS_PUNCH, 0, 0], speed: 50 }, { moves: [SPLASH, 0, 0, 0], speed: 150 },
    )), 1, 0);
    const events = trail(turn);
    expect(events.slice(0, 4)).toEqual([...PRE_PASS(0), "STRINGID_USEDMOVE"]);
    expect(events.filter((event) => event.startsWith("FP:"))).toHaveLength(3);
  });

  it("a faster player Focus Punch user also runs the pre-pass before its own action", () => {
    const turn = runTurn(createFactoryFullTurnBattleState(config(
      { moves: [TACKLE, FOCUS_PUNCH, 0, 0], speed: 150 }, { moves: [SPLASH, 0, 0, 0], speed: 50 },
    )), 1, 0);
    expect(trail(turn).slice(0, 4)).toEqual([...PRE_PASS(0), "STRINGID_USEDMOVE"]);
  });

  it("the opponent's Focus Punch runs the pre-pass with gBattlerAttacker = 1", () => {
    const turn = runTurn(createFactoryFullTurnBattleState(config(
      { moves: [SPLASH, 0, 0, 0], speed: 150 }, { moves: [TACKLE, FOCUS_PUNCH, 0, 0], speed: 50 },
    )), 0, 1);
    expect(trail(turn).slice(0, 4)).toEqual([...PRE_PASS(1), "STRINGID_USEDMOVE"]);
  });

  it("two Focus Punch users run two pre-passes in battler-index order, whoever is faster", () => {
    const turn = runTurn(createFactoryFullTurnBattleState(config(
      { moves: [TACKLE, FOCUS_PUNCH, 0, 0], speed: 50 }, { moves: [TACKLE, FOCUS_PUNCH, 0, 0], speed: 150 },
    )), 1, 1);
    expect(trail(turn).slice(0, 7)).toEqual([...PRE_PASS(0), ...PRE_PASS(1), "STRINGID_USEDMOVE"]);
  });

  it("an asleep Focus Punch user is skipped (STATUS1_SLEEP guard)", () => {
    const turn = runTurn(createFactoryFullTurnBattleState(config(
      { moves: [TACKLE, FOCUS_PUNCH, 0, 0], speed: 150, status1: 3 }, { moves: [SPLASH, 0, 0, 0], speed: 50 },
    )), 1, 0);
    expect(trail(turn).filter((event) => event.startsWith("FP:"))).toEqual([]);
  });

  it("a Truant-loafing Focus Punch user is skipped (truantCounter guard), the acting turn is not", () => {
    const first = runTurn(createFactoryFullTurnBattleState(config(
      { moves: [TACKLE, FOCUS_PUNCH, 0, 0], speed: 150, ability: ABILITY_TRUANT }, { moves: [SPLASH, 0, 0, 0], speed: 50 },
    )), 1, 0);
    expect(trail(first).slice(0, 3)).toEqual(PRE_PASS(0));
    expect(first.state.rules.rulesContext.battlers[0].truantCounter).toBe(1);
    const second = runTurn(first.state, 1, 0);
    expect(trail(second).filter((event) => event.startsWith("FP:"))).toEqual([]);
  });

  it("control: another chosen move (Focus Punch only in the moveset) runs no pre-pass", () => {
    const turn = runTurn(createFactoryFullTurnBattleState(config(
      { moves: [TACKLE, FOCUS_PUNCH, 0, 0], speed: 50 }, { moves: [SPLASH, 0, 0, 0], speed: 150 },
    )), 0, 0);
    expect(trail(turn).filter((event) => event.startsWith("FP:"))).toEqual([]);
  });

  it("Scene OFF takes Cmd_playanimation's HITMARKER_NO_ANIMATIONS arm: both prints, no animation, same RNG", () => {
    const sides = config({ moves: [TACKLE, FOCUS_PUNCH, 0, 0], speed: 50 }, { moves: [SPLASH, 0, 0, 0], speed: 150 });
    const on = runTurn(createFactoryFullTurnBattleState(sides), 1, 0);
    const off = runTurn(sceneOff(createFactoryFullTurnBattleState(sides)), 1, 0);
    expect(trail(off).slice(0, 3)).toEqual(["FP:STRINGID_EMPTYSTRING3", "FP:STRINGID_PKMNTIGHTENINGFOCUS@0", "STRINGID_USEDMOVE"]);
    expect(off.state.rules.rulesContext.battlers[1].hp).toBe(on.state.rules.rulesContext.battlers[1].hp);
    expect(off.state.rng).toEqual(on.state.rng);
  });
});
