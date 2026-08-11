/**
 * EXPLOSION census set (docs/executable-frontier-census.md's ranked table):
 * `B_SCR_OP_SETATKHPTOZERO` (`Cmd_setatkhptozero`, `battle_script_commands.c
 * :6577-6588`) and `B_SCR_OP_TRYEXPLOSION` (`Cmd_tryexplosion`, `:6538-6575`).
 * Registering this pair makes `EFFECT_EXPLOSION`
 * (`BattleScript_EffectExplosion`, `data/battle_scripts_1.s:374-408`)
 * executable end to end -- every other opcode the script emits
 * (attackcanceler/attackstring/ppreduce/damagecalc/typecalc/accuracycheck/
 * hitanimation/healthbarupdate/datahpupdate/tryfaintmon/moveendto/
 * jumpifnexttargetvalid/...) was already registered by earlier effects.
 *
 * Both opcodes are source-complete with zero barriers -- neither has a
 * branch this engine cannot model:
 *
 * `Cmd_tryexplosion`'s only real branch is the Damp scan, and it scans
 * *every* active battler slot (`gBattlerTarget = 0..gBattlersCount`), not
 * just the target -- a battler on the attacker's own side with Damp still
 * blocks the attacker's own Explosion. The scan has no
 * `gAbsentBattlerFlags` filter at all (unlike the "find first target" loop
 * right after it), so it is ported as a plain `battlers[0..battlersCount)`
 * ability scan. On success it re-points `gBattlerTarget` via the exact same
 * "first non-attacker, non-absent battler" loop `Cmd_selectfirstvalidtarget`
 * already implements (`resolveFirstValidTarget`, reused here rather than
 * duplicated) -- singles only ever has one candidate, but the loop itself is
 * general. `gBattleMoveDamage = gBattleMons[gActiveBattler].hp` is genuinely
 * dead: the value it computes is never read (the immediately following
 * `BtlController_EmitHealthBarUpdate` call passes the literal
 * `INSTANT_HP_BAR_DROP` sentinel (`0x7FFF`), not `gBattleMoveDamage`, and
 * `Cmd_damagecalc` overwrites `gBattleMoveDamage` a few opcodes later before
 * anything else reads it) -- not modeled, matching this engine's existing
 * precedent for provably-unread state (`Cmd_tryfaintmon`'s own doc comment).
 * The controller round trip itself (`MarkBattlerForControllerExec`) is real
 * and is modeled: it is what makes the immediately following
 * `Cmd_setatkhptozero`'s own busy-gate actually block until the health-bar
 * controller task completes, exactly like any other two-controller-emit
 * sequence in this hit chain.
 *
 * `Cmd_setatkhptozero` is a plain HP-to-zero write plus its own controller
 * round trip, structurally identical to `Cmd_datahpupdate`'s negative-damage
 * (HP-gain) branch (`battleScriptHitChainOpcode.ts`) -- same
 * `withBattler`/`withBattleScriptPartyMemberHp` write-through pattern, same
 * `hp-change` event, no bide/shellBell/physical-special bookkeeping (source
 * has none on this opcode either).
 *
 * `EFFECT_EXPLOSION`'s own defense-halving (Self-Destruct/Explosion cut the
 * defender's Defense in half, `pokemon.c:3228-3230`) is a `Cmd_damagecalc`
 * concern, not this opcode's -- ported in `damageCalc.ts`'s
 * `calculateBaseDamage` (`moveEffect === "EFFECT_EXPLOSION"` branch), wired
 * from `damagecalcOpcodeHandler`'s own `moveRow.effect` read
 * (`battleScriptHitChainOpcode.ts`). That gap existed before this module
 * (`calculateBaseDamage` never modeled it) and is fixed by this same
 * registration, not deferred.
 */
import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import { recordBattleScriptAbilityReveal } from "./battleScriptAiReveal.ts";
import {
  markBattleScriptControllerPending,
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlerContext,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import { resolveBattleScriptLabel, type BattleScriptProgram } from "./battleScriptProgram.ts";
import { withBattler } from "./battleScriptHitChainOpcode.ts";
import { resolveFirstValidTarget } from "./battleScriptTargetIterationOpcode.ts";
import type { BattleScriptControllerIdlePort } from "./battleScriptSourceCommands.ts";
import {
  withBattleScriptPartyMemberHp,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";

/** include/constants/abilities.h. */
const ABILITY_DAMP = 6;
/** include/battle_controllers.h: BtlController_EmitHealthBarUpdate's "snap to current HP" sentinel. */
const INSTANT_HP_BAR_DROP = 0x7fff;

function requireBattlerRole(
  rules: BattleScriptRulesContext,
  role: "attacker" | "target",
): BattleScriptBattlerId {
  const value = rules.selectorRoles[role];
  if (value === null) throw new Error(`Cmd_${role === "attacker" ? "setatkhptozero" : "tryexplosion"} requires a ${role} role`);
  return value;
}

function controllerBusyBlock(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
) {
  return transitionBattleScriptCommand(
    context,
    Object.freeze({
      kind: "block" as const,
      reason: Object.freeze({
        kind: "controller-busy" as const,
        programCounter: context.state.programCounter,
        opcodeId: context.instruction.opcodeId,
        opcodeName: context.instruction.opcodeName,
      }),
    }),
  );
}

/**
 * `Cmd_tryexplosion` (`:6538-6575`). Zero operands. `gBattlersCount`'s engine
 * equivalent is `battleTopology.battlersCount` (2 or 4).
 */
function createTryexplosionHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (context.instruction.operands.length !== 0) {
      throw new Error(`invalid B_SCR_OP_TRYEXPLOSION shape at program counter ${context.state.programCounter}`);
    }
    if (!isControllerIdle(context)) return controllerBusyBlock(context);
    const rules = context.state.rulesContext;
    const { battlersCount } = rules.battleTopology;

    let dampBattler: BattleScriptBattlerId | null = null;
    for (let battler = 0; battler < battlersCount; battler += 1) {
      if (rules.battlers[battler]!.ability === ABILITY_DAMP) {
        dampBattler = battler as BattleScriptBattlerId;
        break;
      }
    }

    if (dampBattler === null) {
      const attacker = requireBattlerRole(rules, "attacker");
      const target = resolveFirstValidTarget(rules);
      const scheduler = markBattleScriptControllerPending(context.state.scheduler, attacker);
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        {
          rulesContext: Object.freeze({
            ...rules,
            selectorRoles: Object.freeze({ ...rules.selectorRoles, target }),
          }),
          scheduler,
          events: Object.freeze([
            Object.freeze({
              kind: "health-bar-update" as const,
              battler: attacker,
              healthValue: INSTANT_HP_BAR_DROP,
            }),
          ]),
        },
      );
    }

    const failTarget = resolveBattleScriptLabel(context.program, "BattleScript_DampStopsExplosion");
    if (!failTarget) throw new Error("Cmd_tryexplosion: BattleScript_DampStopsExplosion has no committed label");
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter: failTarget.programCounter }),
      {
        rulesContext: recordBattleScriptAbilityReveal(
          Object.freeze({
            ...rules,
            lastUsedAbility: ABILITY_DAMP,
            selectorRoles: Object.freeze({ ...rules.selectorRoles, target: dampBattler }),
          }),
          dampBattler,
          rules.battlers[dampBattler].ability,
        ),
      },
    );
  };
}

/** `Cmd_setatkhptozero` (`:6577-6588`). Zero operands. */
function createSetatkhptozeroHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (context.instruction.operands.length !== 0) {
      throw new Error(`invalid B_SCR_OP_SETATKHPTOZERO shape at program counter ${context.state.programCounter}`);
    }
    if (!isControllerIdle(context)) return controllerBusyBlock(context);
    const rules = context.state.rulesContext;
    const attacker = requireBattlerRole(rules, "attacker");
    const attackerState = rules.battlers[attacker];
    const currentHp = attackerState.hp;

    const nextRules = withBattler(
      Object.freeze({
        ...rules,
        party: withBattleScriptPartyMemberHp(rules.party, attackerState.side, attackerState.partyIndex, 0),
      }),
      attacker,
      { hp: 0 },
    );
    const scheduler = markBattleScriptControllerPending(context.state.scheduler, attacker);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: nextRules,
        scheduler,
        events: Object.freeze([
          Object.freeze({ kind: "hp-change" as const, battler: attacker, from: currentHp, to: 0 }),
        ]),
      },
    );
  };
}

export function createBattleScriptExplosionOpcodeHandlers(
  program: BattleScriptProgram,
  ports: Readonly<{ isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext> }>,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const handlers: Record<number, BattleScriptOpcodeHandler<BattleScriptRulesContext>> = Object.create(null) as Record<
    number,
    BattleScriptOpcodeHandler<BattleScriptRulesContext>
  >;
  const install = (opcodeName: string, handler: BattleScriptOpcodeHandler<BattleScriptRulesContext>) => {
    const instruction = program.instructions.find((candidate) => candidate.opcodeName === opcodeName);
    if (!instruction) throw new Error(`committed Battle Script program does not emit ${opcodeName}`);
    handlers[instruction.opcodeId] = handler;
  };
  install("B_SCR_OP_TRYEXPLOSION", createTryexplosionHandler(ports.isControllerIdle));
  install("B_SCR_OP_SETATKHPTOZERO", createSetatkhptozeroHandler(ports.isControllerIdle));
  return Object.freeze(handlers);
}
