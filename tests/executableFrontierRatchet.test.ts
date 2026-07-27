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
 * This list may shrink, never grow. Each entry is real debt tracked in
 * ISSUES.md #41 (`battleScene.ts`) and #39 (its turn-keyed structure); the
 * 2026-07-24 supervisor session already retired three entries by porting
 * `featherDance.ts` off its recorded per-tick table onto the real animation
 * script. New engine work must derive behaviour from ported source, not from
 * a replayed capture of the one battle we happen to have on disk.
 */
const ALLOWED_RECORDING_IMPORTS: ReadonlySet<string> = new Set([
  "src/engine/factorySwapPresentation.ts::../data/gen/battle1-swap-rentalmons-dump.json",
  "src/engine/battleScene.ts::../data/gen/battle1-turn1-ram-dump.json",
  "src/engine/battleScene.ts::../data/gen/battle1-turn2-ram-dump.json",
  "src/engine/battleScene.ts::../data/gen/battle1-grovyle-faint-ram-dump.json",
]);

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
  ["src/engine/battleScriptHitChainOpcode.ts", 23],
  ["src/engine/battleScriptAttackCancelerOpcode.ts", 5],
  ["src/engine/battleScriptMoveEndOpcode.ts", 7],
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
  // Factory singles) and GetMostSuitableMonToSwitchInto's pass-2 AI_CalcDmg
  // raw-damage fallback (no fixture on this rung reaches it). 3 -> 2 (§4
  // slice 10, this session): the player-side interactive party-menu branch
  // is no longer an unsupported-branch placeholder -- it is now a genuine,
  // named `"player-choice-required"` halt (battleScriptMachine.ts) that
  // resumes through the same slice-1-9 machinery, so it retires from this
  // barrier count entirely (it isn't a barrier of any kind anymore).
  ["src/engine/battleScriptOpenPartyScreenOpcode.ts", 2],
  ["src/engine/battleScriptGetexpOpcode.ts", 2],
  ["src/engine/battleScriptCheckteamslostOpcode.ts", 3],
  // Forced-switch ground truth §4 slices 1/2/3 tail (SWITCHHANDLEORDER,
  // GETSWITCHEDMONDATA/SWITCHINDATAUPDATE, SWITCHINANIM, HPTHRESHOLDS,
  // CANCELALLACTIONS, VARIOUS's RESET_PLAYER_FAINTED case, SWITCHINEFFECTS):
  // switchhandleorder's cases 0/1 (multi-battler collection / order-only, not
  // this script's case 2/3); switchindataupdate's STATUS2_ESCAPE_PREVENTION
  // and STATUS3_ALWAYS_HITS cross-battler clears (battlerPreventingEscape/
  // battlerWithSureHit identity, unmodeled); switchinanim's BATTLE_TYPE_ARENA
  // point-init call (never set for Factory); various's every id other than
  // RESET_PLAYER_FAINTED (7); switchineffects's Spikes branch (structurally
  // unreachable -- SIDE_STATUS_SPIKES has no writer anywhere in this engine,
  // even after the screens/weather setter registration widened sideStatuses
  // to genuinely carry REFLECT/LIGHTSCREEN/MIST/SAFEGUARD too), its Truant
  // switch-in-hack counter set, and its AbilityBattleEffects
  // (ABILITYEFFECT_ON_SWITCHIN) dispatch for the small closed set of trigger
  // abilities. 8 total, none reachable by either committed forced-switch
  // fixture (their switched-in mons carry a non-trigger ability, no item, no
  // Spikes/escape/sure-hit state).
  ["src/engine/battleScriptSwitchinOpcode.ts", 8],
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
  // §1c/§6 item 5), widened this session (runtime weather-form loop, PROGRESS
  // 460): Cmd_bicword still narrows to the one concrete operand pair
  // BattleScript_DamagingWeatherContinuesEnd uses (HitsAllNoUndergroundBonus's
  // single-bit clear / MoveUsedWokeUp's HITMARKER_WAKE_UP_CLEAR are its one
  // barrier). Cmd_addbyte/Cmd_jumpifarraynotequal no longer special-case a
  // single tuple -- both now resolve any pointer/comparand through the same
  // shared byte-lvalue universe battleScriptSetByte.ts owns (plus the
  // gBattlersCount sentinel), so BattleScript_WeatherFormChangesLoop's own
  // sBATTLER pair runs for real, and so (as the same mechanism, not a special
  // case) do Perish Song's/Teeter Dance's/Palace's own loop counters. Still
  // one shared barrier per opcode: Triple Kick's counter (delta 10 isn't a
  // resolvable literal), the multi-hit string buffer (pointer outside the
  // universe), Ghost Curse's compare, and the link-battle loop (both compare
  // a selector role -- gBattlerAttacker/gBattlerFainted -- this universe does
  // not expose). 3 total, none reachable by either committed sandstorm/
  // safeguard/lightscreen fixture.
  ["src/engine/battleScriptDamagingWeatherOpcode.ts", 3],
  // TRYCASTFORMDATACHANGE registration (PROGRESS 458's supervisor-decided
  // (a)/(b) split): CastformDataTypeChange (battle_util.c:2396-2429) is
  // ported source-completely as a pure function; the one barrier fires only
  // when a live Forecast Castform battler's type is stale for the active
  // weather (form nonzero) -- the real BattleScript_CastformChange/
  // SET_BATTLER_TYPE/four-form table this engine has not ported. Every
  // non-Castform battler (the vast majority of matchups) and an
  // already-correctly-typed Castform never reach it.
  ["src/engine/battleScriptTryCastformDataChangeOpcode.ts", 1],
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
  // concrete call site). Cmd_manipulatedamage is narrowed to DMG_CHANGE_SIGN
  // (1 barrier, DMG_RECOIL_FROM_MISS/DMG_DOUBLED -- Struggle recoil/Beat Up,
  // out of this slice's scope). Widened, not narrowed further (EFFECT_ENDEAVOR
  // registration, seam-scout §9.2): Cmd_copyarray's own accepted tuple set now
  // also covers `gHpDealt<-gBattleMoveDamage` (BattleScript_EffectEndeavor's
  // own reverse pair, stashing its set-damage across typecalc's STAB/type-
  // effectiveness multiply so Endeavor's real damage is immune to it) -- one
  // more concrete call site resolves (Endeavor no longer among the "every
  // other" rejected sites), same single barrier call site, count unchanged.
  ["src/engine/battleScriptIngrainLeechSeedWrapOpcode.ts", 3],
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
  ["src/engine/battleScriptProtectlikeOpcode.ts", 1],
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
  return source
    .split("\n")
    .filter((line) => line.includes("unsupportedBranch(") && !/^\s*(?:export\s+)?(?:function|const)\s+unsupportedBranch\b/.test(line))
    .length;
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

  it("pins the debt at four imports across two modules", () => {
    const byFile = new Map<string, number>();
    for (const entry of ALLOWED_RECORDING_IMPORTS) {
      const file = entry.split("::")[0]!;
      byFile.set(file, (byFile.get(file) ?? 0) + 1);
    }
    expect([...byFile.entries()].sort()).toEqual([
      ["src/engine/battleScene.ts", 3],
      ["src/engine/factorySwapPresentation.ts", 1],
    ]);
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
