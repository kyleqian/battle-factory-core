import { createBattleResolutionPresentation } from "../../src/engine/battleResolutionPresentation.ts";
import { createBattleCommandPresentation } from "../../src/engine/battleCommandPresentation.ts";
import { createBattleState, type BattleKernelSemanticEvent } from "../../src/engine/battleDecisionBoundary.ts";
import { createFactoryFullTurnBattleState } from "../../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";

const RATTATA = Object.freeze({ species: 19, moveId: 150, moves: [150,150,150,150] as const, pp: [40,40,40,40] as const, ability: 0, item: 0, friendship: 0, attack: 76, defense: 55, spAttack: 45, spDefense: 55, speed: 92, hp: 105, maxHp: 105, types: ["TYPE_NORMAL","TYPE_NORMAL"] as const });
const BENCH = Object.freeze({ species: 19, isEgg: false, abilityNum: 0, personality: 0, level: 50, friendship: 0, hp: 105, maxHP: 105, attack: 76, defense: 55, speed: 92, spAttack: 45, spDefense: 55, status1: 0, item: 0, moves: [150,150,150,150] as const, pp: [40,40,40,40] as const });
function stagedBattle() { return createFactoryFullTurnBattleState({ requestId: 1, rngSeed: 1, player: RATTATA, trainer: RATTATA, playerBenchHp: [105,105], playerBenchOverride: [BENCH, BENCH], trainerBenchHp: [105,105], trainerBenchOverride: [BENCH, BENCH] }); }

function build(kind: "use-move" | "switch") {
  const initial = stagedBattle();
  const boundary = initial.boundary;
  if (boundary.kind !== "decision-required" || boundary.request.kind !== "command") throw new Error("no cmd");
  const state = createBattleState({ rules: initial.rules, rngSeed: 9, request: boundary.request });
  const mk = (seq: number, payload: any) => Object.freeze({ sequence: seq, payload: Object.freeze(payload), provenance: Object.freeze({ programCounter: 1, opcodeId: 1, opcodeName: "t", dispatcher: "t", sourceLabel: "s", sourceStatementLine: 1, instructionExecution: 1 }) }) as BattleKernelSemanticEvent;
  const events = [
    mk(0, { kind: "message", messageId: "STRINGID_BUTNOTHINGHAPPENED", substitutions: [] }),
    ...(kind === "use-move" ? [mk(1, { kind: "set-battler-pp-data", battler: 0, movePosition: 0, pp: 39 })] : []),
  ];
  const transition = Object.freeze({ kind: "decision-required", state, events: Object.freeze(events), nextRequest: boundary.request }) as any;
  return createBattleResolutionPresentation({
    sourceRequest: boundary.request,
    sourceDecision: kind === "switch" ? { kind: "switch", partyIndex: 1 } : { kind: "use-move", moveSlot: 0, targetBattler: 0 },
    beforeRules: initial.rules,
    transition,
    fieldBoundary: createBattleCommandPresentation(boundary.request, initial.rules.rulesContext).field,
    ...(kind === "switch" ? {} : { confirmHandoff: { fightDisplayCursor: 0, idleBounceElapsed: 0 } }),
  });
}

for (const kind of ["use-move", "switch"] as const) {
  const res = build(kind);
  const cmds = res.segments[0]!.commands;
  console.log(kind, "commands:", cmds.map(c => c.type).join(","), "sourceDecision:", res.sourceDecision.kind);
  const turnEnd = cmds.findIndex(c => c.type === "turn-end");
  if (turnEnd >= 0) {
    const t = cmds[turnEnd]! as any;
    console.log("  turn-end minFrames:", t.timing.minimumFrames);
    for (const pe of [t.timing.minimumFrames - 3, t.timing.minimumFrames - 2, t.timing.minimumFrames - 1]) {
      const view = createBattleResolutionPresentationRenderView(Object.freeze({ ...res, commandIndex: turnEnd, lifecycle: Object.freeze({ phase: "presenting", phaseElapsed: pe }) }));
      console.log(`  pe=${pe} bottom=${view.bottom} message=${view.message !== null}`);
    }
  }
}
