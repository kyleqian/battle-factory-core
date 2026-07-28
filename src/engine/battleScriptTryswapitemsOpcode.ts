/**
 * `B_SCR_OP_TRYSWAPITEMS` / `Cmd_tryswapitems`
 * (`battle_script_commands.c:9189-9269`).
 *
 * Trick's command owns the active-item exchange, attacker-owned
 * `changedItems` bookkeeping, both persistent held-item controller writes,
 * both Choice-lock clears, and the swap message-table selector. The later
 * source MOVEEND_CHANGED_ITEMS case restores the attacker's temporarily
 * cleared active item from `changedItems`.
 */
import {
  markBattleScriptControllerPending,
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import {
  resolveBattleScriptLabel,
  type BattleScriptInstruction,
  type BattleScriptProgram,
} from "./battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_ITEM_ENIGMA_BERRY,
  withBattleScriptPartyMemberItem,
  type BattleScriptMoveEndHalfwords,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import { requireBattlerRole, withBattler } from "./battleScriptHitChainOpcode.ts";

const ITEM_NONE = 0;
const ITEM_ORANGE_MAIL = 121;
const ITEM_RETRO_MAIL = 132;
const ABILITY_STICKY_HOLD = 60;

const BATTLE_TYPE_LINK = 1 << 1;
const BATTLE_TYPE_EREADER_TRAINER = 1 << 11;
const BATTLE_TYPE_BATTLE_TOWER = 1 << 8;
const BATTLE_TYPE_DOME = 1 << 16;
const BATTLE_TYPE_PALACE = 1 << 17;
const BATTLE_TYPE_ARENA = 1 << 18;
const BATTLE_TYPE_FACTORY = 1 << 19;
const BATTLE_TYPE_PIKE = 1 << 20;
const BATTLE_TYPE_PYRAMID = 1 << 21;
const BATTLE_TYPE_RECORDED_LINK = 1 << 25;
const BATTLE_TYPE_TRAINER_HILL = 1 << 26;
const BATTLE_TYPE_SECRET_BASE = 1 << 27;
const BATTLE_TYPE_FRONTIER = (
  BATTLE_TYPE_BATTLE_TOWER
  | BATTLE_TYPE_DOME
  | BATTLE_TYPE_PALACE
  | BATTLE_TYPE_ARENA
  | BATTLE_TYPE_FACTORY
  | BATTLE_TYPE_PIKE
  | BATTLE_TYPE_PYRAMID
);
const ITEM_SWAP_ALLOWED_SPECIAL_BATTLES = (
  BATTLE_TYPE_LINK
  | BATTLE_TYPE_EREADER_TRAINER
  | BATTLE_TYPE_FRONTIER
  | BATTLE_TYPE_SECRET_BASE
  | BATTLE_TYPE_RECORDED_LINK
);

const B_MSG_ITEM_SWAP_TAKEN = 0;
const B_MSG_ITEM_SWAP_GIVEN = 1;
const B_MSG_ITEM_SWAP_BOTH = 2;

function isMail(item: number): boolean {
  return item >= ITEM_ORANGE_MAIL && item <= ITEM_RETRO_MAIL;
}

function requireInstruction(instruction: BattleScriptInstruction): string {
  const [failure] = instruction.operands;
  if (
    instruction.opcodeId !== 0xd2
    || instruction.dispatcher !== "Cmd_tryswapitems"
    || instruction.operands.length !== 1
    || failure?.widthBytes !== 4
  ) {
    throw new Error(
      "invalid B_SCR_OP_TRYSWAPITEMS shape at program counter "
        + instruction.programCounter,
    );
  }
  return failure.expression;
}

function failureControl(program: BattleScriptProgram, expression: string) {
  const failure = resolveBattleScriptLabel(program, expression);
  if (!failure) {
    throw new Error(`Cmd_tryswapitems: unresolved failure target ${expression}`);
  }
  return Object.freeze({
    kind: "jump" as const,
    programCounter: failure.programCounter,
  });
}

function replaceHalfwords(
  source: BattleScriptMoveEndHalfwords,
  updates: ReadonlyMap<number, number>,
): BattleScriptMoveEndHalfwords {
  return Object.freeze(
    source.map((value, index) => updates.get(index) ?? value),
  ) as unknown as BattleScriptMoveEndHalfwords;
}

function createTryswapitemsHandler(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const failureExpression = requireInstruction(context.instruction);
    const fail = () => transitionBattleScriptCommand(
      context,
      failureControl(program, failureExpression),
    );
    const rules = context.state.rulesContext;
    const attacker = requireBattlerRole(rules, "attacker");
    const target = requireBattlerRole(rules, "target");
    const flags = rules.battleTopology.battleTypeFlags;

    // Source order matters: Trainer Hill rejects before side or item reads.
    if ((flags & BATTLE_TYPE_TRAINER_HILL) !== 0) return fail();
    const regularBattle = (flags & ITEM_SWAP_ALLOWED_SPECIAL_BATTLES) === 0;
    if (rules.battlers[attacker].side === 1 && regularBattle) return fail();

    const attackerSide = rules.battlers[attacker].side;
    const targetSide = rules.battlers[target].side;
    if (
      regularBattle
      && (
        (rules.knockedOffMons[attackerSide] & (1 << rules.battlers[attacker].partyIndex)) !== 0
        || (rules.knockedOffMons[targetSide] & (1 << rules.battlers[target].partyIndex)) !== 0
      )
    ) {
      return fail();
    }

    const oldItemAtk = rules.battlers[attacker].item;
    const newItemAtk = rules.battlers[target].item;
    if (
      (oldItemAtk === ITEM_NONE && newItemAtk === ITEM_NONE)
      || oldItemAtk === BATTLE_SCRIPT_ITEM_ENIGMA_BERRY
      || newItemAtk === BATTLE_SCRIPT_ITEM_ENIGMA_BERRY
      || isMail(oldItemAtk)
      || isMail(newItemAtk)
    ) {
      return fail();
    }

    if (rules.battlers[target].ability === ABILITY_STICKY_HOLD) {
      const stickyHold = resolveBattleScriptLabel(
        program,
        "BattleScript_StickyHoldActivates",
      );
      if (!stickyHold) {
        throw new Error("Cmd_tryswapitems: unresolved BattleScript_StickyHoldActivates");
      }
      return transitionBattleScriptCommand(
        context,
        Object.freeze({
          kind: "jump",
          programCounter: stickyHold.programCounter,
        }),
        {
          rulesContext: Object.freeze({
            ...rules,
            lastUsedAbility: ABILITY_STICKY_HOLD,
          }),
        },
      );
    }

    let nextRules = withBattler(rules, attacker, { item: ITEM_NONE });
    nextRules = withBattler(nextRules, target, { item: oldItemAtk });
    let party = withBattleScriptPartyMemberItem(
      nextRules.party,
      attackerSide,
      nextRules.battlers[attacker].partyIndex,
      newItemAtk,
    );
    party = withBattleScriptPartyMemberItem(
      party,
      targetSide,
      nextRules.battlers[target].partyIndex,
      oldItemAtk,
    );
    const changedItems = replaceHalfwords(
      nextRules.changedItems,
      new Map([[attacker, newItemAtk]]),
    );
    const choicedMove = replaceHalfwords(
      nextRules.choicedMove,
      new Map([[attacker, 0], [target, 0]]),
    );
    const multistringChooser = (
      oldItemAtk !== ITEM_NONE && newItemAtk !== ITEM_NONE
        ? B_MSG_ITEM_SWAP_BOTH
        : oldItemAtk === ITEM_NONE
          ? B_MSG_ITEM_SWAP_TAKEN
          : B_MSG_ITEM_SWAP_GIVEN
    );
    nextRules = Object.freeze({
      ...nextRules,
      party,
      changedItems,
      choicedMove,
      multistringChooser,
      battleTextBuff1Item: newItemAtk,
      battleTextBuff2Item: oldItemAtk,
    });

    let scheduler = markBattleScriptControllerPending(
      context.state.scheduler,
      attacker,
    );
    scheduler = markBattleScriptControllerPending(scheduler, target);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: nextRules,
        scheduler,
        events: Object.freeze([
          Object.freeze({
            kind: "set-battler-item" as const,
            battler: attacker,
            item: newItemAtk,
          }),
          Object.freeze({
            kind: "set-battler-item" as const,
            battler: target,
            item: oldItemAtk,
          }),
        ]),
      },
    );
  };
}

export function createBattleScriptTryswapitemsOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_TRYSWAPITEMS",
  );
  if (instructions.length !== 1) {
    throw new Error(
      "B_SCR_OP_TRYSWAPITEMS requires exactly 1 concrete start, "
        + `got ${instructions.length}`,
    );
  }
  requireInstruction(instructions[0]!);
  return Object.freeze({
    [instructions[0]!.opcodeId]: createTryswapitemsHandler(program),
  });
}
