import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Two ratchets that enforce ROADMAP S10's "Executable-frontier reset" rules as
// tests rather than prose, because prose rules are the ones that quietly decay.
//
//   1. Overfit containment (ROADMAP S10 §4, ISSUES #41): production engine
//      modules must not gain new imports of canonical RAM recordings. The
//      allowlist below may only ever *shrink*.
//   2. Barrier inventory (ROADMAP S10 §1): the (a)/(b) registration policy
//      lets an opcode register with unimplemented branches guarded by an
//      explicit `unsupported-branch` halt. That policy is only safe while
//      barriers stay narrow and few — an opcode that is 90% barrier is
//      "registered" on paper and inert in practice. Pinning the counts forces
//      every new barrier into a diff a reviewer sees.

function collectTsFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectTsFiles(path, out);
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      out.push(path);
    }
  }
  return out;
}

const PRODUCTION_TS_FILES = collectTsFiles("src");

/** A canonical recording: a captured trace of one specific oracle playthrough. */
const RECORDING_IMPORT = /^\s*import\s[^;]*?\sfrom\s+"([^"]*(?:-dump|-probe|-watch|-boundaries)[^"]*\.json)"/gm;

/**
 * Every production import of a canonical recording that exists today.
 *
 * This list may shrink, never grow. It is empty now that ISSUES #41's last
 * production import has retired. New engine work must derive behaviour from
 * ported source, not from a replayed capture of the one battle we happen to
 * have on disk.
 */
const ALLOWED_RECORDING_IMPORTS: ReadonlySet<string> = new Set();

/**
 * `unsupportedBranch(...)` call sites per production module, excluding each
 * module's own helper definition.
 *
 * Raising a number here is a real decision, not a formality: it means another
 * slice of a registered opcode is unreachable. If a diff raises one of these,
 * the brief should say which source construct it defers and why that construct
 * is not on the path the step claims to make executable.
 */
const PINNED_BARRIER_COUNTS: ReadonlyMap<string, number> = new Map([
  // 19 -> 25 (SetMoveEffect status-write quartet registration, PROGRESS 444):
  // Cmd_seteffectwithchance's own two barriers were retired (real dispatch via
  // applySetMoveEffect), but that function adds 3 of its own -- MOVE_EFFECT_SLEEP
  // and MOVE_EFFECT_TOXIC (their own scripts call the still-unregistered
  // Cmd_seteffectprimary instead of this dispatch site) and the whole family-B
  // (status2/misc, effectByte > PRIMARY_STATUS_MOVE_EFFECT) switch, e.g. FLINCH.
  // The two new opcodes add their own malformed/uncovered-input barriers:
  // Cmd_printfromtable (3: bad operand shape, an unrecognized table pointer
  // outside the quartet's own 7 tables, an out-of-range MULTISTRING_CHOOSER
  // index) and Cmd_updatestatusicon (2: bad operand shape, the doubles-only
  // BS_ATTACKER_WITH_PARTNER branch). Net: -2 retired + 3 + 3 + 2 = +6.
  // 25 -> 23 (Ingrain/Leech Seed/Wrap registration, docs/ingrain-leechseed-
  // wrap-ground-truth.md §5): two barriers retired for real, not narrowed --
  // Cmd_datahpupdate's negative-damage (HP gain) branch is now a genuine
  // maxHP-clamped heal (Ingrain/Leech Seed's own end-turn ticks need it), and
  // Cmd_cleareffectsonfaint's STATUS2_WRAPPED cross-battler clear now has the
  // `wrappedBy` identity this doc's own setter registration adds, so it
  // clears for real instead of barriering.
  // 23 -> 24 (EFFECT_ENDEAVOR registration, seam-scout §9.2/PROGRESS 463's
  // side merge): Cmd_setdamagetohealthdifference registers source-completely
  // (zero barriers, two branches, both implemented). Cmd_adjustsetdamage
  // adds exactly one new barrier -- the same HOLD_EFFECT_FOCUS_BAND gap
  // Cmd_adjustnormaldamage already carries (`gSpecialStatuses[target].
  // focusBanded`'s own roll is unmodeled), now duplicated onto this sibling
  // opcode since it is a distinct call site, not a narrowing of the existing
  // one. Named, reachability-tested (tests/battleScriptHitChainOpcode.test.ts
  // "(b) unsupported-branch barrier: Focus Band, only when actually held").
  // 24 -> 22 (primary status-move opcode cluster registration,
  // docs/status-cluster-ground-truth.md): Cmd_seteffectprimary is now
  // registered and applySetMoveEffect's MOVE_EFFECT_SLEEP/MOVE_EFFECT_TOXIC
  // barriers retire for real -- both effect bytes are now live switch cases
  // (SLEEP's Uproar/ability re-check + drawn duration, TOXIC's status1 write)
  // reached from BattleScript_EffectSleep/_EffectToxic via that opcode.
  // 22 -> 23 (docs/yawn-thrash-endturn-design.md Rung 1): Cmd_accuracycheck's
  // top-level operand-form gate narrows from "only ACC_CURR_MOVE" to "only
  // ACC_CURR_MOVE or NO_ACC_CALC_CHECK_LOCK_ON" -- a real widening, not a new
  // barrier (8 of 11 non-ACC_CURR_MOVE call sites, including
  // BattleScript_EffectYawn's own, now execute instead of halting). The net
  // +1 is the new `accuracycheckNoAccCalcCheckLockOn` helper's own
  // STATUS3_ALWAYS_HITS gate, a distinct call site mirroring the
  // ACC_CURR_MOVE branch's identical existing Lock-On barrier (line ~741) --
  // provably unreachable today (STATUS3_ALWAYS_HITS is never set by any
  // production code, per battleScriptSwitchinOpcode.ts's own read-only
  // precedent) but kept as a loud, named barrier rather than silently
  // assumed away, per this codebase's own house style. Reachability-tested:
  // tests/battleScriptHitChainOpcode.test.ts "production accuracycheck
  // (Cmd_accuracycheck) NO_ACC_CALC_CHECK_LOCK_ON dispatch".
  // 23 -> 22 (EFFECT_DESTINY_BOND): Cmd_tryfaintmon's
  // HITMARKER_DESTINYBOND branch now source-completely schedules
  // BattleScript_DestinyBondTakesLife above the original faint-script frame.
  // 22 -> 21 (EFFECT_SPIKES): tryfaintmon_spikes now executes its guarded
  // pass-through and faint pop/jump, clearing SPIKES_DAMAGED at the source point.
  // 21 -> 20 (EFFECT_HEAL_BELL): Cmd_updatestatusicon's
  // BS_ATTACKER_WITH_PARTNER branch now emits for the present attacker and,
  // only in doubles, its present positional partner. The former blanket
  // barrier is retired rather than moved.
  // 19 -> 18 (Family-B Cluster 3): FaintClearSetData's owner-sensitive Mean
  // Look release now reads battlerPreventingEscape instead of barriering.
  // 18 -> 16 (Lock On / Mind Reader): both accuracy forms now apply the
  // source's packed-status + battlerWithSureHit ownership predicate.
  // 16 -> 13 (Focus Band): adjustnormaldamage/adjustnormaldamage2's shared
  // barrier and adjustsetdamage's sibling barrier are retired by the live
  // holder-only rolls, while resultmessage's generic barrier dispatch is
  // removed now that HUNG_ON call-current transfers to the real hang-on script.
  // 13 -> 12 (Ability absorption): JumpIfMoveFailed now source-completely
  // redirects Volt Absorb, Water Absorb, and Flash Fire to their real
  // healing/full-HP/boost scripts instead of stopping at one shared barrier.
  // 12 -> 11 (Cmd_datahpupdate substitute-FADES): the `remaining < damage`
  // overkill branch now does source-clamped bookkeeping (gHpDealt and
  // shellBellDmg take the remaining HP, not the raw damage) and both zero-HP
  // outcomes (overkill, and damage exactly equal to the remaining HP) push
  // BattleScript_SubstituteFade as a machine `call` instead of halting
  // (battle_script_commands.c:1875-1891).
  // 11 -> 10 (S10 widened-scope B1): Cmd_accuracycheck now resolves the
  // source Enigma-vs-item-table holdEffect/holdEffectParam branch, so the
  // former Enigma Berry evasion-up barrier has no live call site.
  ["src/engine/battleScriptHitChainOpcode.ts", 10],
  // 4 -> 3 (Snatch row 5c): the action-order redirect, PressurePPLose,
  // winner-only flag consumption, and pushed BattleScript_SnatchedMove
  // continuation are now live; Lightning Rod remains the adjacent barrier.
  // 3 -> 2 (seed-23 stretch): CANCELER_IN_LOVE's explicit
  // BattleScriptPush(BattleScript_MoveUsedIsInLoveCantAttack) now uses the
  // machine's existing call-explicit directive. The two remaining sites are
  // Lightning Rod redirection and battle-outcome handoff.
  ["src/engine/battleScriptAttackCancelerOpcode.ts", 2],
  // 7 -> 6 (ON_DAMAGE contact abilities): state 3's seven-case barrier
  // retires as one call site; Color Change/Rough Skin/status/Cute Charm
  // callbacks and their RNG/status mutations now execute source-completely.
  // 6 -> 5 (move-end state 12 King's Rock): HOLD_EFFECT_FLINCH now runs its
  // source-ordered holder/damage gates, %100 draw, Gen-3 move-flag check,
  // and synchronous non-certain SetMoveEffect flinch mutation. The five
  // remaining barriers belong to states 0, 2, 4, 5, and 11; state 12 has
  // none.
  // 5 -> 4 (MOVEEND_IMMUNITY_ABILITIES): the eight status-curing abilities
  // now clear source-exact battle/party state, emit the controller status
  // write, run BattleScript_AbilityCuredStatus, and rescan state 4 after its
  // return. MOVEEND_ITEM_EFFECTS_ALL's full cure/White Herb family now does
  // the same source-exact pushed-script rescan, leaving only state 0's barrier.
  // 4 -> 2 (both Synchronize states): target-first and attacker-second now
  // consume SetMoveEffect's banked reflectable status, call the committed
  // callback, and re-enter the real primary-status controller path. Only
  // Only state 0 remains barriered.
  ["src/engine/battleScriptMoveEndOpcode.ts", 1],
  ["src/engine/battleScriptJumpifbyteOpcode.ts", 1],
  // Forced-switch ground truth §4 slice 1: one operand-shape barrier, shared
  // by both the unmodeled-memWord and unmodeled-value cases (e.g.
  // gBattleMoveDamage / HITMARKER_NO_ATTACKSTRING, neither reachable on
  // Factory's own BattleScript_HandleFaintedMon path).
  ["src/engine/battleScriptJumpifwordOpcode.ts", 1],
  // Executable-frontier census (2026-07-25): 14 of the committed program's 15
  // concrete jumpifhalfword/jumpifmove/jumpifnotmove call sites compare a
  // memHword pointer other than gCurrentMove (gChosenMove, gBattleWeather,
  // gTrainerBattleOpponent_A) -- unmodeled, so every one of them is this same
  // single named (b) barrier at runtime. Only BattleScript_EffectHit's own
  // Surf guard (gCurrentMove) is modeled, which is the registration's whole
  // point.
  ["src/engine/battleScriptJumpifhalfwordOpcode.ts", 1],
  // Forced-switch ground truth §4 slice 2: doubles/multi topology (not
  // Factory singles). 3 -> 2 (§4
  // slice 10, this session): the player-side interactive party-menu branch
  // is no longer an unsupported-branch placeholder -- it is now a genuine,
  // named `"player-choice-required"` halt (battleScriptMachine.ts) that
  // resumes through the same slice-1-9 machinery, so it retires from this
  // barrier count entirely (it isn't a barrier of any kind anymore).
  // 2 -> 1 (rung-12 trainer faint replacement): pass-2 AI_CalcDmg selection
  // now preserves the global-current-move/candidate-TypeCalc and u8-bestDmg
  // source quirks, so competitive multi-candidate replacements execute.
  ["src/engine/battleScriptOpenPartyScreenOpcode.ts", 1],
  // GETEXP registration (ROADMAP S10 rung 4): Cmd_getexp's Frontier
  // short-circuit (state 0 -> 6) is live; the general EXP/level-up/evolution
  // machinery (states 1-5, non-Frontier only) is the one barrier. The selector
  // barrier (docs/barrier-reachability-triage.md item 6) now resolves
  // BS_FAINTED too (SpikesOnFaintedBattlerFainted's `getexp BS_FAINTED`,
  // battle_script_commands.c:3264's GetBattlerForBattleScript BS_FAINTED arm)
  // -- all five committed call sites resolve; the remaining selector barrier
  // is a future-input guard. 2 total, unchanged.
  ["src/engine/battleScriptGetexpOpcode.ts", 2],
  ["src/engine/battleScriptCheckteamslostOpcode.ts", 3],
  // Forced-switch ground truth §4 slices 1/2/3 tail (SWITCHHANDLEORDER,
  // GETSWITCHEDMONDATA/SWITCHINDATAUPDATE, SWITCHINANIM, HPTHRESHOLDS,
  // CANCELALLACTIONS, VARIOUS's RESET_PLAYER_FAINTED case, SWITCHINEFFECTS):
  // switchhandleorder's cases 0/1 (multi-battler collection / order-only, not
  // this script's case 2/3); SwitchInClearSetData's unconditional
  // STATUS2_WRAPPED clear; switchinanim's BATTLE_TYPE_ARENA
  // point-init call (never set for Factory); various's every id other than
  // RESET_PLAYER_FAINTED (7) -- now also including GET_BATTLER_FAINTED (4,
  // docs/barrier-reachability-triage.md item 4, the Pursuit switch-out
  // `getbattlerfainted BS_TARGET` macro expansion, written into
  // battleCommunication0) as a live case. The Truant counter write and grouped
  // ABILITYEFFECT_ON_SWITCHIN dispatch are source-ported. 4 total, none
  // reached by the committed forced-switch fixtures;
  // the Spikes fixture now executes its shared path, while their other state
  // carries no trigger ability/item/escape/sure-hit/wrapped dependency.
  // 10 -> 9: Spikes damage now executes through the shared source scripts.
  // 9 -> 8: Mean Look release now compares battlerPreventingEscape.
  // 8 -> 6: Lock On clear/refresh now compares battlerWithSureHit.
  ["src/engine/battleScriptSwitchinOpcode.ts", 4],
  // Primary-effect stat-change registration (docs/primary-stat-ground-truth.md):
  // Cmd_playanimation is narrowed to its B_ANIM_STATS_CHANGE arm (the only
  // animType BattleScript_EffectStatUp/EffectStatDown ever pass) -- any other
  // animType (2 barriers: an unrecognized animType, an unrecognized argument
  // operand shape) defers the RAIN/SUN/SANDSTORM/HAIL-continues,
  // HITMARKER_NO_ANIMATIONS-redirect, and semi-invulnerability branches this
  // registration's two callers never reach. Cmd_jumpifstatus2 is narrowed to
  // its one concrete value this route needs (STATUS2_SUBSTITUTE, the DOWN
  // family's Substitute early-out) -- the other 36 concrete call sites' own
  // STATUS2_* masks (MULTIPLETURNS/FOCUS_ENERGY/CONFUSION/
  // ESCAPE_PREVENTION/...) are a separate barrier (1).
  ["src/engine/battleScriptStatbuffchangeOpcode.ts", 3],
  // Screens/weather registration slice 5 (docs/screens-weather-ground-truth.md
  // §1c/§6 item 5), widened through the runtime weather-form loop (PROGRESS
  // 460) and wake-up pass-through: Cmd_bicword now models all three concrete
  // source operand pairs, including MoveUsedWokeUp's source-documented
  // never-read HITMARKER_WAKE_UP_CLEAR. Its one generic unknown-pair guard
  // remains a deliberate future-input barrier. Cmd_addbyte/
  // Cmd_jumpifarraynotequal no longer special-case a
  // single tuple -- both now resolve any pointer/comparand through the same
  // shared byte-lvalue universe battleScriptSetByte.ts owns (plus the
  // gBattlersCount sentinel), so BattleScript_WeatherFormChangesLoop's own
  // sBATTLER pair runs for real, and so (as the same mechanism, not a special
  // case) do Perish Song's/Teeter Dance's/Palace's own loop counters. Still
  // guards are the special `sMULTIHIT_STRING + 4` addbyte expression, the
  // shared addbyte universe fallback, bicword's future unknown operand pair,
  // and jumpifarraynotequal's unknown pointer/comparand pair. The call-site
  // count therefore deliberately remains 4 even though the live wake-up
  // operand is no longer blocked.
  ["src/engine/battleScriptDamagingWeatherOpcode.ts", 4],
  // TRYCASTFORMDATACHANGE registration (PROGRESS 458's supervisor-decided
  // (a)/(b) split): CastformDataTypeChange (battle_util.c:2396-2429) is
  // ported source-completely as a pure function; the one barrier fires only
  // when a live Forecast Castform battler's type is stale for the active
  // weather (form nonzero) -- the real BattleScript_CastformChange/
  // SET_BATTLER_TYPE/four-form table this engine has not ported. Every
  // non-Castform battler (the vast majority of matchups) and an
  // already-correctly-typed Castform never reach it.
  // 1 -> 0 (ROADMAP S10 gate-4, side lane): the last barrier is RETIRED, not
  // narrowed. Cmd_trycastformdatachange now writes the durable type pair
  // (SET_BATTLER_TYPE) via withBattler, writes gBattleStruct->formToChangeInto
  // = form - 1, and pushes the real BattleScript_CastformChange continuation
  // (modeled as the machine's `call`; its end3 pops back to the loop's
  // addbyte). B_SCR_OP_DOCASTFORMCHANGEANIMATION is registered alongside
  // (Cmd_docastformchangeanimation, battle_script_commands.c:9730-9740) and
  // emits the B_ANIM_CASTFORM_CHANGE controller animation as a typed kernel
  // event -- its only new guard is the shared controller-busy block, which is
  // not an unsupported-branch barrier. Reachability-pinned by every case in
  // tests/battleScriptTryCastformDataChangeOpcode.test.ts "(b) live form
  // change".
  ["src/engine/battleScriptTryCastformDataChangeOpcode.ts", 0],
  // Ingrain/Leech Seed/Wrap setter opcode registration (docs/ingrain-
  // leechseed-wrap-ground-truth.md §5): Cmd_copyarray is narrowed to
  // BattleScript_LeechSeedTurnDrain's own `gBattleMoveDamage<-gHpDealt, size
  // 4` tuple (1 barrier, every other of its then-15 other concrete call
  // sites -- Triple Kick, Pain Split, Bide, Endeavor, ...). Cmd_jumpifability
  // is narrowed to the plain BS_TARGET/BS_ATTACKER selector with
  // ABILITY_LIQUID_OOZE (1 barrier, every other ability id across its 17
  // other concrete call sites -- Shield Dust/Suction Cups/Own Tempo/Water
  // Veil/Rock Head/Clear Body/... -- plus the BS_ATTACKER_SIDE/
  // BS_NOT_ATTACKER_SIDE AbilityBattleEffects branches, unreached by any
  // concrete call site). Cmd_manipulatedamage used to be narrowed to
  // DMG_CHANGE_SIGN (its third barrier, DMG_RECOIL_FROM_MISS/DMG_DOUBLED --
  // Struggle recoil/Beat Up) but is now source-complete across all three
  // modes (docs/barrier-reachability-triage.md item 10), retiring that
  // barrier: 3 -> 2. Widened, not narrowed further (EFFECT_ENDEAVOR
  // registration, seam-scout §9.2): Cmd_copyarray's own accepted tuple set now
  // also covers `gHpDealt<-gBattleMoveDamage` (BattleScript_EffectEndeavor's
  // own reverse pair, stashing its set-damage across typecalc's STAB/type-
  // effectiveness multiply so Endeavor's real damage is immune to it) -- one
  // more concrete call site resolves (Endeavor no longer among the "every
  // other" rejected sites), same single barrier call site, count unchanged.
  ["src/engine/battleScriptIngrainLeechSeedWrapOpcode.ts", 2],
  // REMOVEITEM registration (docs/endturn-abilities-items-ground-truth.md
  // §5 slice 4): Cmd_removeitem's only unmodeled branch is a selector that
  // resolves to no live battler role at all (BS_ATTACKER before an attacker
  // is assigned) -- both of the 13 concrete call sites' own selectors
  // (BS_SCRIPTING/BS_ATTACKER) resolve for real on every ENDTURN_ITEMS1 tick
  // this registration drives.
  ["src/engine/battleScriptRemoveitemOpcode.ts", 1],
  // Primary status-move opcode cluster registration
  // (docs/status-cluster-ground-truth.md): Cmd_jumpifstatus/Cmd_jumpiftype/
  // Cmd_jumpifsideaffecting each narrow to a small named concrete-value set
  // (all values these five scripts and the wider committed program's other
  // concrete call sites actually use); an operand outside that set is the
  // one barrier per opcode (3 total). Cmd_jumpifcantmakeasleep has no
  // narrowing at all -- every one of its 3 concrete call sites is the same
  // shape, so it contributes zero barriers.
  ["src/engine/battleScriptStatusPrimaryOpcode.ts", 3],
  // Executable-frontier census's own top-ranked next registration:
  // B_SCR_OP_JUMPIFNEXTTARGETVALID + B_SCR_OP_SELECTFIRSTVALIDTARGET (flips
  // EFFECT_EARTHQUAKE executable). Cmd_selectfirstvalidtarget has no
  // BATTLE_TYPE_DOUBLE branch at all (same loop for singles and doubles) and
  // registers with zero barriers. Cmd_jumpifnexttargetvalid's own
  // BATTLE_TYPE_DOUBLE next-target scan (continuing a multi-target
  // spread-move loop to another battler slot) is unreachable for Level-50
  // singles -- its one named barrier, reachability-tested in
  // tests/battleScriptTargetIterationOpcode.test.ts.
  ["src/engine/battleScriptTargetIterationOpcode.ts", 1],
  // B_SCR_OP_SETPROTECTLIKE registration (EFFECT_PROTECT/EFFECT_ENDURE, the
  // census's next-ranked blocker after EFFECT_EARTHQUAKE): Cmd_setprotectlike
  // has exactly one real branch this engine cannot source-model --
  // sProtectSuccessRates[protectUses] indexes one past its own 4-entry table
  // once protectUses reaches 4 (four consecutive successful Protects), which
  // reads whatever ROM byte follows the const array on real hardware. Named
  // (b) barrier, reachability-tested in
  // tests/battleScriptProtectlikeOpcode.test.ts.
  // 1 -> 0 (docs/protectlike-oob-adjacent-byte.md): the OOB read is MEASURED,
  // not guessed -- the linker placed sMovesForbiddenToCopy at 0x0831c3e0
  // immediately after the 8-byte table at 0x0831c3d8, so sProtectSuccessRates
  // [4] == its first u16 0x0076 == MOVE_METRONOME == 118 (verified in both
  // pokeemerald.gba and pokeemerald.elf). The barrier is RETIRED: protectUses
  // >= 4 now reads that constant and rolls normally (~0.18% success per use),
  // so no branch halts. Dual-outcome + notLastTurn-gate reachability-tested in
  // tests/battleScriptProtectlikeOpcode.test.ts.
  ["src/engine/battleScriptProtectlikeOpcode.ts", 0],
  // B_SCR_OP_TRYKO registration (EFFECT_OHKO, ranked-table row 5, alongside
  // B_SCR_OP_TRYSETDESTINYBONDTOHAPPEN/B_SCR_OP_TRYHEALHALFHEALTH which both
  // register with zero barriers): Cmd_tryKO's own HOLD_EFFECT_FOCUS_BAND
  // roll needs gSpecialStatuses[target].focusBanded (the same unmodeled
  // subsystem Cmd_adjustnormaldamage/Cmd_adjustsetdamage already barrier on
  // -- a distinct call site, not a narrowing); its STATUS3_ALWAYS_HITS
  // Lock-On/Mind-Reader branch needs gDisableStructs[target].
  // Lock On ownership is now source-complete; only Focus Band remains. 1
  // total, reachability-tested in tests/battleScriptTryKOOpcode.test.ts.
  // 1 -> 0 (ROADMAP S10 dispatch-queue item 2, side lane): the last barrier
  // is RETIRED, not narrowed -- the reason string was stale (the hit chain
  // models gSpecialStatuses[target].focusBanded for real since the 16 -> 13
  // Focus Band retirement above). Cmd_tryKO now draws the holder-only
  // %10 roll before the Sturdy check (source order, one Random() consumed
  // whenever the target holds Focus Band -- even on a failed roll or a
  // Sturdy short-circuit), writes focusBanded via the sibling machinery on
  // success, and consumes it on the OHKO-lands path as the MOVE_RESULT_
  // FOE_HUNG_ON hp-1 clamp with lastUsedItem. Reachability-pinned in
  // tests/battleScriptTryKOOpcode.test.ts "Cmd_tryKO's Focus Band
  // holder-only roll".
  ["src/engine/battleScriptTryKOOpcode.ts", 0],
  // B_SCR_OP_FORCERANDOMSWITCH/SWITCHOUTABILITIES/RETURNTOBALL/FINISHACTION
  // registration (EFFECT_ROAR, docs/roar-multihit-registration-scout.md §4
  // rungs 10-14): Cmd_forcerandomswitch/Cmd_switchoutabilities/
  // Cmd_returntoball register with zero barriers (the trainer-battle branch
  // is Factory's only reachable one, source-complete). B_SCR_OP_FINISHACTION
  // is the one barrier -- registered as an unconditional (b) guard rather
  // than a real implementation, per docs/script-terminal-gate3-evidence.md's
  // own explicit deferral (a correct Cmd_finishaction needs a typed
  // action-scheduler receipt this engine does not have yet). Doubly
  // unreachable for Factory: BattleScript_SuccessForceOut's own
  // jumpifbattletype BATTLE_TYPE_TRAINER fork always taken, and even the
  // counterfactual non-trainer arm barriers first on the preceding
  // setoutcomeonteleport/VARIOUS_SET_TELEPORT_OUTCOME (already-registered
  // generic VARIOUS dispatcher). Reachability-tested directly in
  // tests/battleScriptForceSwitchOpcode.test.ts.
  ["src/engine/battleScriptForceSwitchOpcode.ts", 1],
  // Voluntary switching executes before ordinary moves through the real
  // BattleScript_ActionSwitch tail. Cmd_jumpifnopursuitswitchdmg's Pursuit-
  // interception arm (all six guard conditions true) is now fully modeled --
  // it falls through into the switch script's own double-power Pursuit hit and
  // rewrites the Pursuit user's turn-order action to B_ACTION_TRY_FINISH
  // (dispatch-queue item 5, 2026-08-08). The one remaining barrier is the
  // `gMultiHitCounter != 1` RIGHT-flank target selection
  // (battle_script_commands.c:8732-8738): a doubles-only position this
  // singles reducer's switch path never reaches (it always stages
  // `setmultihit 1`). Reachability-pinned in
  // tests/factoryBattleScriptFullTurnDecision.test.ts.
  ["src/engine/factoryBattleScriptFullTurnDecision.ts", 1],
  // B_SCR_OP_CLEARSTATUSFROMEFFECT/SETSEMIINVULNERABLEBIT/CLEARSEMIINVULNERABLEBIT
  // registration (EFFECT_SEMI_INVULNERABLE + collateral EFFECT_RAZOR_WIND/
  // SKY_ATTACK/SKULL_BASH, docs/semi-invulnerable-registration-scout.md §5
  // rungs 6-7): Cmd_setsemiinvulnerablebit/Cmd_clearsemiinvulnerablebit
  // register with zero barriers (a pure gCurrentMove-keyed status3 write, all
  // 3 concrete instances shaped identically). Cmd_clearstatusfromeffect's
  // only unmodeled branch is the same GetBattlerForBattleScript selector
  // shape battleScriptRemoveitemOpcode.ts already established (BS_ATTACKER
  // before an attacker is assigned) -- all 5 concrete call sites' own
  // selector (BS_ATTACKER) resolves for real on every reachable committed
  // script this registration drives.
  ["src/engine/battleScriptSemiInvulnerableOpcode.ts", 1],
  // B_SCR_OP_JUMPIFCANTSWITCH / EFFECT_BATON_PASS registration: ordinary
  // Level-50 singles resolves both assembled selectors, all three volatile
  // gates, and the selected side's authoritative six-slot party scan. The
  // one barrier is the source's in-game-partner/MULTI/two-opponents/ordinary-
  // doubles scan family (battle_script_commands.c:4714-4848), whose party-
  // half and second-active-slot identities the current context does not own.
  // Reachability-tested in tests/battleScriptJumpifcantswitchOpcode.test.ts.
  ["src/engine/battleScriptJumpifcantswitchOpcode.ts", 1],
  // Gate-5 audit item (j.6): AI_CheckBadMove_CheckEffect's if_effect table
  // dispatch (`data/battle_ai_scripts.s`) is source-complete for the ported
  // per-effect handlers (EFFECT_ROAR/SLEEP/PARALYZE/CONFUSE family); every
  // other table-listed effect shares one named barrier
  // (`factoryAiCheckBadMove.ts` "AI_CheckBadMove_CheckEffect: source-complete
  // if_effect table lookup"), reachability-tested in
  // tests/factoryAiCheckBadMove.test.ts.
  ["src/engine/factoryAiCheckBadMove.ts", 1],
  // Gate-5 audit item (j.6): AI_CheckViability's if_effect table dispatch is
  // source-complete for the ported per-effect handlers (Swagger/Counter/...);
  // every other table-listed effect shares one named barrier
  // (`factoryAiCheckViability.ts` "AI_CHECK_VIABILITY_TABLE_EFFECTS" branch),
  // reachability-tested in tests/factoryAiCheckViability.test.ts. An
  // effect with no if_effect table entry at all is not a barrier (it's the
  // source-faithful zero-dispatch "scored" no-op, same shape as the other
  // ported handlers) and does not add to this count.
  ["src/engine/factoryAiCheckViability.ts", 1],
]);

function recordingImportsIn(file: string): string[] {
  const source = readFileSync(file, "utf8");
  const found: string[] = [];
  for (const match of source.matchAll(RECORDING_IMPORT)) {
    found.push(`${file}::${match[1]}`);
  }
  return found;
}

function barrierCallSitesIn(file: string): number {
  const source = readFileSync(file, "utf8");
  const lines = source.split("\n");
  const helperCalls = lines
    .filter((line) => line.includes("unsupportedBranch(") && !/^\s*(?:export\s+)?(?:function|const)\s+unsupportedBranch\b/.test(line))
    .length;
  const definesHelper = lines.some(
    (line) => /^\s*(?:export\s+)?(?:function|const)\s+unsupportedBranch\b/.test(line),
  );
  if (definesHelper) return helperCalls;
  // The factoryAi* modules have no `unsupportedBranch(...)` helper at all
  // (local or imported): each barrier is its own `{ kind:
  // "unsupported-branch", ... }` result-literal construction. A trailing
  // `,` marks a construction; the type union member naming the shape ends
  // in `;` and must not be counted.
  const literalConstructions = lines
    .filter((line) => /kind:\s*"unsupported-branch",\s*$/.test(line))
    .length;
  return helperCalls + literalConstructions;
}

describe("overfit containment ratchet (ROADMAP S10 §4, ISSUES #41)", () => {
  it("adds no production import of a canonical RAM recording", () => {
    const found = PRODUCTION_TS_FILES.flatMap(recordingImportsIn).sort();
    const added = found.filter((entry) => !ALLOWED_RECORDING_IMPORTS.has(entry));
    expect(
      added,
      "A production module imported a canonical recording. Engine behaviour must "
        + "be derived from ported source, not replayed from a capture of one battle. "
        + "See ROADMAP S10's Executable-frontier reset §4 and ISSUES #41.",
    ).toEqual([]);
  });

  it("keeps the allowlist honest — a retired import must be deleted from it", () => {
    const found = new Set(PRODUCTION_TS_FILES.flatMap(recordingImportsIn));
    const stale = [...ALLOWED_RECORDING_IMPORTS].filter((entry) => !found.has(entry)).sort();
    expect(
      stale,
      "These allowlist entries no longer exist in the tree — delete them so the "
        + "ratchet records the win and cannot silently re-admit them.",
    ).toEqual([]);
  });

  it("pins the production recording-import debt at zero", () => {
    const byFile = new Map<string, number>();
    for (const entry of ALLOWED_RECORDING_IMPORTS) {
      const file = entry.split("::")[0]!;
      byFile.set(file, (byFile.get(file) ?? 0) + 1);
    }
    expect([...byFile.entries()].sort()).toEqual([]);
  });
});

describe("barrier inventory ratchet (ROADMAP S10 §1)", () => {
  it("pins the number of unsupported-branch barriers per registered-opcode module", () => {
    const actual = new Map(
      [...PINNED_BARRIER_COUNTS.keys()].map((file) => [file, barrierCallSitesIn(file)] as const),
    );
    expect(
      [...actual.entries()].sort(),
      "Barrier count changed. The (a)/(b) registration policy stays safe only "
        + "while barriers are narrow and rare — update this pin deliberately and "
        + "say in the brief which source construct the new barrier defers.",
    ).toEqual([...PINNED_BARRIER_COUNTS.entries()].sort());
  });

  it("finds no barriers outside the modules that pin them", () => {
    const unpinned = PRODUCTION_TS_FILES
      .filter((file) => !PINNED_BARRIER_COUNTS.has(file))
      .filter((file) => barrierCallSitesIn(file) > 0)
      .sort();
    expect(
      unpinned,
      "A new module grew unsupported-branch barriers without an entry in "
        + "PINNED_BARRIER_COUNTS. Add it, with a reachability test per barrier.",
    ).toEqual([]);
  });

  it("requires every barrier-bearing module to have a test asserting the halt kind", () => {
    const missing = [...PINNED_BARRIER_COUNTS.keys()].filter((file) => {
      const testFile = file.replace(/^src\/engine\//, "tests/").replace(/\.ts$/, ".test.ts");
      let source: string;
      try {
        source = readFileSync(testFile, "utf8");
      } catch {
        return true;
      }
      return !source.includes("unsupported-branch");
    });
    expect(
      missing,
      "ROADMAP S10 §1 requires each (b) guard to be proven reachable by a Tier-1 "
        + "test. This module's test file does not assert the unsupported-branch halt.",
    ).toEqual([]);
  });
});
