/**
 * S10 step (iv) part 3/3 (the closing piece): the pure adapter from the
 * kernel's real terminal decision boundary (`submitBattleDecision`'s
 * `{ kind: "terminal", outcome }`) to `roundController.ts`'s `BattleResolution`.
 * Ground truth: `docs/round-controller-outcome-seam.md` §4 piece 5 (the
 * recommended shape) and `docs/battle-resolution-adapter-ground-truth.md`
 * (draw verdict §1/§4, party-status live-sync semantics §2).
 *
 * Deliberately takes only the narrow `BattleScriptRulesContext` slice it
 * reads (`battlers`/`battleTopology`/`party`), not the whole context type --
 * a real `BattleScriptRulesContext` satisfies this structurally, and a
 * synthetic terminal state (as the seam doc's own recommendation and the
 * draw unit test below both rely on) needs no other machinery to construct.
 */
import type { BattleMon, BattleParty, BattleStatus } from "./battleScenario.ts";
import type { BattleOutcome } from "./battleDecisionBoundary.ts";
import type { BattleScriptPartyState } from "./battleScriptRulesContext.ts";
import type { BattleResolution } from "./roundController.ts";

/** include/constants/battle.h:114-125 -- all mutually exclusive in real play (one major status at a time). */
const STATUS1_SLEEP_MASK = 0x7;
const STATUS1_POISON = 1 << 3;
const STATUS1_BURN = 1 << 4;
const STATUS1_FREEZE = 1 << 5;
const STATUS1_PARALYSIS = 1 << 6;
const STATUS1_TOXIC_POISON = 1 << 7;

export class BattleResolutionAdapterError extends Error {
  override readonly name = "BattleResolutionAdapterError";
}

/**
 * `GetAilmentFromStatus` (`reference/pokeemerald/src/party_menu.c:1909`)
 * collapses regular and Toxic poison to one `AILMENT_PSN` for the party
 * screen's icon; `BattleStatus` (`battleScenario.ts`) keeps them distinct, so
 * this checks `STATUS1_TOXIC_POISON` ahead of the plain `STATUS1_POISON`
 * bit. Every checked bit is disjoint, so this mapping is total over real
 * `status1` values -- there is no unrepresentable case to barrier on.
 */
export function mapStatus1ToBattleStatus(status1: number): BattleStatus {
  if ((status1 & STATUS1_TOXIC_POISON) !== 0) return "toxic";
  if ((status1 & STATUS1_POISON) !== 0) return "poison";
  if ((status1 & STATUS1_BURN) !== 0) return "burn";
  if ((status1 & STATUS1_FREEZE) !== 0) return "freeze";
  if ((status1 & STATUS1_PARALYSIS) !== 0) return "paralysis";
  if ((status1 & STATUS1_SLEEP_MASK) !== 0) return "sleep";
  return "none";
}

/**
 * `B_OUTCOME_WON(1)` -> `"win"`. `B_OUTCOME_LOST(2)` and `B_OUTCOME_DREW(3)`
 * both -> `"loss"`: the Factory battle-room script has exactly one
 * `case 1` (WON) and falls through to the identical `WarpToLobbyLost` branch
 * for anything else (`docs/battle-resolution-adapter-ground-truth.md` §4) --
 * a draw and a loss are textually indistinguishable to the real game, so
 * this is not a simplifying assumption, it's what the facility actually does.
 */
export function mapTerminalOutcomeToResolutionOutcome(outcome: BattleOutcome): "win" | "loss" {
  return outcome === "player-win" ? "win" : "loss";
}

/** The narrow read surface this adapter needs off a real `BattleScriptRulesContext`. */
export type BattleResolutionTerminalBattler = Readonly<{
  side: 0 | 1;
  partyIndex: number;
  status1: number;
}>;

export type BattleResolutionTerminalRulesSlice = Readonly<{
  battlers: readonly BattleResolutionTerminalBattler[];
  battleTopology: Readonly<{ battlersCount: number }>;
  party: Readonly<{ player: BattleScriptPartyState; opponent: BattleScriptPartyState }>;
}>;

function findActiveBattler(
  rulesSlice: BattleResolutionTerminalRulesSlice,
  side: 0 | 1,
  partyIndex: number,
): BattleResolutionTerminalBattler | undefined {
  const battlersCount = rulesSlice.battleTopology.battlersCount;
  for (let battler = 0; battler < battlersCount; battler += 1) {
    const candidate = rulesSlice.battlers[battler];
    if (candidate !== undefined && candidate.side === side && candidate.partyIndex === partyIndex) {
      return candidate;
    }
  }
  return undefined;
}

/**
 * Per-slot status rule (`docs/round-controller-outcome-seam.md` §4,
 * `docs/battle-resolution-adapter-ground-truth.md` §2/§4): fainted reads
 * "none" (`Cmd_cleareffectsonfaint`'s real-game sync); the slot currently
 * mirrored by a live battler reads that battler's real `status1`; every
 * other (benched) slot keeps whatever status it already carried, because the
 * kernel's party slice does not track bench status at all yet (only
 * `species`/`isEgg`/`hp`, `battleScriptRulesContext.ts:233-237`) -- carrying
 * the pre-battle value forward is the correct source of truth for a slot the
 * kernel never touched this battle, matching the real game's own "nothing
 * clears status while benched" round-trip (ground-truth doc §2b).
 */
function deriveMonStatus(
  slot: BattleScriptPartyState[number],
  activeBattler: BattleResolutionTerminalBattler | undefined,
  preBattleStatus: BattleStatus,
): BattleStatus {
  if (slot.hp === 0) return "none";
  if (activeBattler !== undefined) return mapStatus1ToBattleStatus(activeBattler.status1);
  return preBattleStatus;
}

function deriveBattleParty(
  preBattle: BattleParty,
  partySlice: BattleScriptPartyState,
  rulesSlice: BattleResolutionTerminalRulesSlice,
  side: 0 | 1,
): BattleParty {
  return preBattle.map((mon, index): BattleMon => {
    const slot = partySlice[index];
    if (slot === undefined) {
      throw new BattleResolutionAdapterError(`party slice is missing slot ${index}`);
    }
    const activeBattler = findActiveBattler(rulesSlice, side, index);
    return {
      id: mon.id,
      species: mon.species,
      maxHp: mon.maxHp,
      hp: slot.hp,
      status: deriveMonStatus(slot, activeBattler, mon.status),
    };
  }) as unknown as BattleParty;
}

/**
 * Maps a real (or synthetic, for the draw case) kernel terminal boundary
 * into `roundController.resolveRoundBattle`'s `BattleResolution` input.
 * `id`/`maxHp` are carried verbatim from the pre-battle snapshot -- identity
 * never changes mid-battle, exactly what `assertSamePartyIdentity`
 * (`roundController.ts:292-307`) enforces; `hp` is overlaid from the
 * kernel's own party slice (kept live-synced by every `datahpupdate`,
 * mirroring the real game's `SetMonData` round-trip,
 * `docs/battle-resolution-adapter-ground-truth.md` §2); `rngValue` is the
 * terminal `BattleState.rng.value` unchanged (already the right shape,
 * `docs/round-controller-outcome-seam.md` §3 row 4).
 */
export function deriveBattleResolutionFromTerminalBoundary(
  input: Readonly<{
    rngValue: number;
    outcome: BattleOutcome;
    rulesContext: BattleResolutionTerminalRulesSlice;
    preBattlePlayerParty: BattleParty;
    preBattleOpponentParty: BattleParty;
  }>,
): BattleResolution {
  return {
    outcome: mapTerminalOutcomeToResolutionOutcome(input.outcome),
    playerParty: deriveBattleParty(
      input.preBattlePlayerParty,
      input.rulesContext.party.player,
      input.rulesContext,
      0,
    ),
    opponentParty: deriveBattleParty(
      input.preBattleOpponentParty,
      input.rulesContext.party.opponent,
      input.rulesContext,
      1,
    ),
    rngValue: input.rngValue,
  };
}
