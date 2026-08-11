# End-turn ground truth (ROADMAP S10 PREP — the next orchestration after faint handling)

Prep-scout for the kernel's second C-side state machine. `docs/faint-outcome-
ground-truth.md` §3.1 mapped `HandleFaintedMonActions` — the C-level loop that
drives `BattleScript_GiveExp`/`HandleFaintedMon` outside the Battle Script
VM's own opcode dispatch — and that orchestration has since **landed**
(`src/engine/battleScriptFaintedActionsOrchestration.ts`; `MOVEEND`, `GETEXP`,
`CHECKTEAMSLOST`, `JUMPIFBYTE`, `DOFAINTANIMATION`, `CLEAREFFECTSONFAINT` are
all now registered — see the current opcode set in §0). This doc maps the
sibling machine: `BattleTurnPassed` and everything between one turn's last
action and the next turn's action selection — field timers, per-battler
status ticks, Wish/Perish Song, and the faint re-entry when an end-turn tick
kills something. No `src/` production code is touched by this doc's worker;
this is prep, like its predecessor.

Rerunnable verify script: `tools/probe/verify-end-turn-ground-truth.ts`
(`node --experimental-strip-types tools/probe/verify-end-turn-ground-truth.ts`).
Reruns two committed battle-lab scenarios
(`tools/battle-lab/mechanic-endturn-burn-off.json`,
`tools/battle-lab/mechanic-endturn-toxic-ko-off.json`) against the live
`battle-scene-off` oracle. All 17 checks **PASS** as of this writing.

## 0. Registered opcode set (grepped live, for the reachability table below)

```
ACCURACYCHECK, ADJUSTNORMALDAMAGE, ATTACKANIMATION, ATTACKCANCELER,
ATTACKSTRING, CALL, CHECKTEAMSLOST, CHOSENSTATUSANIMATION,
CLEAREFFECTSONFAINT, CRITCALC, CRITMESSAGE, DAMAGECALC, DATAHPUPDATE,
DECREMENTMULTIHIT, DOFAINTANIMATION, EFFECTIVENESSSOUND, END, END2, FANFARE,
GETEXP, GOTO, HEALTHBARUPDATE, HIDEPARTYSTATUSSUMMARY, HITANIMATION,
JUMPIFBYTE, MAKEVISIBLE, MOVEEND, MOVEVALUESCLEANUP, NOP, PAUSE, PLAYFAINTCRY,
PLAYSE, PPREDUCE, PRINTSELECTIONSTRING, PRINTSELECTIONSTRINGFROMTABLE,
PRINTSTRING, RESULTMESSAGE, RETURN, SETBYTE, SETEFFECTWITHCHANCE,
SETMULTIHIT, SETMULTIHITCOUNTER, STATUS2ANIMATION, STATUSANIMATION,
TRAINERSLIDEIN, TRAINERSLIDEOUT, TRYFAINTMON, TYPECALC, WAITANIMATION,
WAITMESSAGE, WAITSTATE
```
(`grep -rhoE '"B_SCR_OP_[A-Z0-9_]+"' src/engine/*.ts | sort -u`, 49 entries.)

## 1. Source topology: `BattleTurnPassed` and its call graph

`HandleEndTurn_ContinueBattle` (`battle_main.c:3932-3954`, entered once
`gBattleControllerExecFlags==0` after the turn's last action script
finishes) resets five `gBattleStruct` trackers (`turnEffectsTracker`,
`turnEffectsBattlerId`, `wishPerishSongState`, `wishPerishSongBattlerId`,
`turnCountersTracker`) to 0, clears `STATUS2_FLINCHED` on every battler, and
sets `gBattleMainFunc = BattleTurnPassed`.

`BattleTurnPassed` (`:3956-4019`) itself is a straight-line function that
re-enters on every main-loop tick until it falls through to the next turn's
action selection:

```c
void BattleTurnPassed(void) {
    TurnValuesCleanUp(TRUE);
    if (gBattleOutcome == 0) {
        if (DoFieldEndTurnEffects()) return;
        if (DoBattlerEndTurnEffects()) return;
    }
    if (HandleFaintedMonActions()) return;
    gBattleStruct->faintedActionsState = 0;
    if (HandleWishPerishSongOnTurnEnd()) return;
    TurnValuesCleanUp(FALSE);
    ... // outcome fork / next-turn setup, see §1d
}
```

**Load-bearing finding:** `DoFieldEndTurnEffects`/`DoBattlerEndTurnEffects`
are gated on `gBattleOutcome == 0`, but `HandleFaintedMonActions` and
`HandleWishPerishSongOnTurnEnd` are **not** — they always run. This means an
end-turn tick that KOs the last remaining mon (`gBattleOutcome` flips inside
the tick's own script, see §1c) **stops all further field/battler end-turn
processing for every other battler that turn** — a second battler's own
poison/leech/wrap tick that turn never fires once the battle is decided.
This is a real ordering rule, not an edge case to special-case away.

Each of `DoFieldEndTurnEffects`/`DoBattlerEndTurnEffects`/
`HandleWishPerishSongOnTurnEnd` is itself a resumable state machine (progress
tracked in `gBattleStruct` fields that survive across re-entries): whenever a
case triggers an effect, it calls `BattleScriptExecute` (pushing
`gBattleMainFunc` onto a callback stack and running the Battle Script VM
until `end`/`end2`) and returns immediately; the *next* `BattleTurnPassed`
tick (after the pushed script completes and pops back) resumes the tracker
exactly where it left off. A no-op case (guard false) just increments its
tracker and falls through to the next case **in the same tick** — so a full
field/battler pass with nothing to do completes in one `BattleTurnPassed`
call, but every case that actually fires costs one real script-execution
round-trip (and, live, one distinguishable capture window — see §2).

### 1a. `DoFieldEndTurnEffects` — field case order (`battle_util.c:1155-1438`)

The `ENDTURN_*` enum order **is** the execution order (`do { switch }
while (effect==0)`, so cases only advance without firing):

```c
enum { ENDTURN_ORDER, ENDTURN_REFLECT, ENDTURN_LIGHT_SCREEN, ENDTURN_MIST,
       ENDTURN_SAFEGUARD, ENDTURN_WISH, ENDTURN_RAIN, ENDTURN_SANDSTORM,
       ENDTURN_SUN, ENDTURN_HAIL, ENDTURN_FIELD_COUNT };
```

`ENDTURN_ORDER` isn't a real effect — it (re)computes `gBattlerByTurnOrder`
for the whole end-turn pass (insertion sort via `GetWhoStrikesFirst`, the
same speed-order primitive turn-order already needs) and falls through.

### 1b. `DoBattlerEndTurnEffects` — battler case order (`battle_util.c:1464-1783`)

**Per-battler, not per-effect-across-all-battlers.** The outer loop walks
`gBattlerByTurnOrder` (turn-order-first, absent battlers skipped); for the
CURRENT battler, the inner switch walks all 19 cases in enum order before
advancing to the next battler:

```c
enum { ENDTURN_INGRAIN, ENDTURN_ABILITIES, ENDTURN_ITEMS1, ENDTURN_LEECH_SEED,
       ENDTURN_POISON, ENDTURN_BAD_POISON, ENDTURN_BURN, ENDTURN_NIGHTMARES,
       ENDTURN_CURSE, ENDTURN_WRAP, ENDTURN_UPROAR, ENDTURN_THRASH,
       ENDTURN_DISABLE, ENDTURN_ENCORE, ENDTURN_LOCK_ON, ENDTURN_CHARGE,
       ENDTURN_TAUNT, ENDTURN_YAWN, ENDTURN_ITEMS2, ENDTURN_BATTLER_COUNT };
```

So the real global order is: **field pass completes in full (all 10 cases,
in turn order for the side-scoped ones) → battler 1 (by turn order) runs all
19 cases → battler 2 runs all 19 cases → ... → `HandleFaintedMonActions` →
`HandleWishPerishSongOnTurnEnd`.** Burn on the slower battler fires strictly
after every one of the faster battler's 19 cases, not interleaved.

### 1c. The faint re-entry: end-turn KO scripts short-circuit `checkteamslost` INLINE — a real structural difference from the in-turn path

This is the single most load-bearing finding for whoever orchestrates this
next. Unlike a mid-turn hit chain (which only reaches `checkteamslost` via
`moveend` → `HandleFaintedMonActions` → `BattleScript_HandleFaintedMon`, per
`docs/faint-outcome-ground-truth.md` §1), **every damaging end-turn tick
script calls `tryfaintmon` + `checkteamslost` directly, inline, before
`HandleFaintedMonActions` ever runs**:

```
BattleScript_PoisonTurnDmg/BurnTurnDmg/NightmareTurnDmg/CurseTurnDmg/WrapTurnDmg
  (all `goto BattleScript_DoTurnDmg`):
BattleScript_DoTurnDmg::
    orword gHitMarker, HITMARKER_IGNORE_SUBSTITUTE | HITMARKER_PASSIVE_HP_UPDATE
    healthbarupdate BS_ATTACKER
    datahpupdate BS_ATTACKER
    tryfaintmon BS_ATTACKER          ; note BS_ATTACKER, not BS_TARGET --
                                      ; the ticking battler IS "the attacker"
                                      ; here (gBattlerAttacker = gActiveBattler
                                      ; is set by the C loop), so the existing
                                      ; selectorRoles.attacker resolves this
                                      ; correctly with NO new selector work
                                      ; (contrast ISSUES #43's BS_TARGET gap)
    checkteamslost BattleScript_DoTurnDmgEnd
BattleScript_DoTurnDmgEnd:: end2
```

`Cmd_tryfaintmon`'s `BS_ATTACKER` branch (`battle_script_commands.c:2989-3000`)
pushes `BattleScript_FaintAttacker` (`data/battle_scripts_1.s:2809-2815`) —
the same four-step shape as `FaintTarget` (`playfaintcry BS_ATTACKER, pause,
dofaintanimation BS_ATTACKER, cleareffectsonfaint BS_ATTACKER, printstring,
return`) but with every selector already resolvable via the existing
`BS_ATTACKER` role. **This means the six-opcode faint-branch gap ISSUES #43
identified for `BS_TARGET` does not block end-turn faints at all** — they
use the already-working selector.

`checkteamslost`'s inline call here is a **local short-circuit for the
field/battler loop** (so `DoBattlerEndTurnEffects`'s outer `while` can stop
once `gBattleOutcome != 0`, per the gate in §1 above) — it is **not** where
the switch-in dance happens. `HandleFaintedMonActions()` still runs
unconditionally right after (§1, no `gBattleOutcome` gate), re-executes
`checkteamslost` a second time inside `BattleScript_HandleFaintedMon`
(idempotent — same sum, same bit), and **that** is what drives
`BattleScript_GiveExp`'s Factory short-circuit and either
`BattleScript_FaintedMonEnd` (terminal) or the real
`openpartyscreen`/`switchhandleorder`/`SendOutNew` dance (non-terminal) —
**exactly the same fork already banked in
`docs/faint-outcome-ground-truth.md` §1b**. Live proof of all of this is in
§2b below (a real end-turn KO, non-terminal, with the switch-in dance
completing).

**Leech Seed is the one exception** to the inline-`checkteamslost` pattern:
`BattleScript_LeechSeedTurnDrain` (`:3265-3283`) calls
`tryfaintmon BS_ATTACKER` (the seeded mon) **and** `tryfaintmon BS_TARGET`
(the HP recipient — could itself be at 1 HP and die to recoil-adjacent edge
cases, though not from this drain), but never calls `checkteamslost` itself
— the outcome decision for a Leech-Seed kill is deferred entirely to the
unconditional `HandleFaintedMonActions()` call. Not a bug, just an
inconsistency worth knowing before assuming all 5 `DoTurnDmg`-family scripts
behave identically.

### 1d. Turn-boundary reset (after `HandleWishPerishSongOnTurnEnd` returns FALSE)

`TurnValuesCleanUp(FALSE)` (`battle_main.c:4857-4892`) zeroes every
`ProtectStruct`, decrements `isFirstTurn`/`rechargeTimer`, and clears
`STATUS2_SUBSTITUTE` for any battler whose Substitute HP already hit 0. Then:
if `gBattleOutcome != 0`, jump straight to `B_ACTION_FINISHED` /
`RunTurnActionsFunctions` (→ eventually `sEndTurnFuncsTable[gBattleOutcome &
0x7F]`, i.e. `HandleEndTurn_BattleWon`/`Lost` — the terminal machinery
`docs/faint-outcome-ground-truth.md` already banked). Otherwise: increment
`battleTurnCounter`, reset `gChosenActionByBattler`/`gChosenMoveByBattler`/
`monToSwitchIntoId`, snapshot `gAbsentBattlerFlags`, and hand off to
`HandleTurnActionSelectionState` for the next turn's menu.

## 2. Ordered enumeration table (reachability, writes, RNG, scripts, opcodes)

Reachability is checked against `src/data/gen/battle-frontier-mons.json`
(882 real Frontier rental entries — the actual Factory L50 catalog) for move
carriers, and against `reference/pokeemerald/src/data/pokemon/species_info.h`
for ability carriers. "Registered?" is checked against §0's live-grepped set.

| # | Case | Reachable at Factory L50 singles? | Random() draws | Writes | Script queued | New opcodes needed beyond §0 |
| - | --- | --- | --- | --- | --- | --- |
| F1 | `ENDTURN_ORDER` | always (every turn) | 0 | `gBattlerByTurnOrder` (insertion sort) | none (pure C) | n/a — not a script |
| F2 | `ENDTURN_REFLECT` | **yes** — 17 Frontier carriers (AMPHAROS, ARTICUNO, CLEFABLE, ...) | 0 | `gSideStatuses`, `gSideTimers[].reflectTimer` | `BattleScript_SideStatusWoreOff` | none (printstring/waitmessage/end2, all §0) |
| F3 | `ENDTURN_LIGHT_SCREEN` | **yes** — 33 carriers | 0 | same shape as F2 | `BattleScript_SideStatusWoreOff` | none |
| F4 | `ENDTURN_MIST` | **NO — zero Frontier carriers of MOVE_MIST** (verified against the full 882-entry catalog, not assumed) | 0 | n/a | `BattleScript_SideStatusWoreOff` | none, but moot |
| F5 | `ENDTURN_SAFEGUARD` | **yes** — 7 carriers (BAYLEEF, BELLOSSOM, CHIMECHO, ...) | 0 | `gSideStatuses`, `gSideTimers[].safeguardTimer` | `BattleScript_SafeguardEnds` | none |
| F6 | `ENDTURN_WISH` | **yes** — 10 carriers (ESPEON, GIRAFARIG, ILLUMISE, ...) | 0 | `gWishFutureKnock.wishCounter`, heals via `datahpupdate` | `BattleScript_WishComesTrue` | **ORWORD** (see B3-B7; shared) |
| F7 | `ENDTURN_RAIN` | **yes** — 31 MOVE_RAIN_DANCE carriers (temporary); no permanent-rain ability carrier found (Drizzle = KYOGRE only, legendary, not a Frontier rental) | 0 | `gBattleWeather`, `gWishFutureKnock.weatherDuration` | `BattleScript_RainContinuesOrEnds` | none (jumpifbyte/playanimation/printfromtable/waitmessage — playanimation is new, see B1) |
| F8 | `ENDTURN_SANDSTORM` | **yes — via BOTH paths.** 16 MOVE_SANDSTORM carriers (temporary), **and TYRANITAR (10 Frontier rental entries) carries ABILITY_SAND_STREAM as its only ability slot** (`species_info.h:7473`), giving genuine **permanent** auto-weather at switch-in. Contradicts an assumed "no Factory-legal auto-weather at L50" — verified, not assumed. | 0 | same shape as F7 | `BattleScript_SandStormHailEnds` / `DamagingWeatherContinues` | none new (printfromtable already covered by F7's needs) |
| F9 | `ENDTURN_SUN` | **yes** — 26 MOVE_SUNNY_DAY carriers (temporary only; Drought = GROUDON, legendary, not a rental) | 0 | same shape | `BattleScript_SunlightContinues`/`SunlightFaded` | none new |
| F10 | `ENDTURN_HAIL` | **yes** — 7 carriers (DELIBIRD, GLALIE, PILOSWINE, ...) | 0 | same shape | `BattleScript_SandStormHailEnds`/`DamagingWeatherContinues` | none new |
| B1 | `ENDTURN_INGRAIN` | **yes** — 5 carriers (CRADILY, LILEEP, SUNFLORA, ...) | 0 | heals `maxHP/16` via `datahpupdate` | `BattleScript_IngrainTurnHeal` | **PLAYANIMATION**, **ORWORD** |
| B2 | `ENDTURN_ABILITIES` | always (every battler, every turn) | **not queued as a script at all** — `AbilityBattleEffects(ABILITYEFFECT_ENDTURN, ...)` is pure C (Speed Boost, Shed Skin, Rain Dish, Ice Body, Poison Heal, etc. — none of these abilities exist as Frontier hooks needing new opcodes beyond what individual ability effects already require) | ability-dependent | n/a here — tracked as its own future slice, out of this doc's scope (weather/ability breadth, not end-turn orchestration) | — |
| B3 | `ENDTURN_ITEMS1`/B19 `ENDTURN_ITEMS2` | **yes** — Leftovers is a real Frontier item (`src/data/gen/battle-frontier-held-items.json`); `ItemBattleEffects(ITEMEFFECT_NORMAL,...)` | item-dependent (Leftovers/Black Sludge itself: 0) | HP heal via `datahpupdate` | item-specific scripts | out of scope — item breadth is its own slice, not new end-turn plumbing |
| B4 | `ENDTURN_LEECH_SEED` | **yes** — 13 carriers (BRELOOM, EXEGGCUTE, EXEGGUTOR, ...) | 0 | drains `maxHP/8` from seeded mon to seeder via **two** `datahpupdate` calls | `BattleScript_LeechSeedTurnDrain` | **PLAYANIMATION, ORWORD, COPYWORD, JUMPIFABILITY (Liquid Ooze), MANIPULATEDAMAGE** |
| B5 | `ENDTURN_POISON` | **yes** — regular poison has no dedicated Frontier "primary poison move" carrier in the checked set (PoisonPowder: 0 carriers) but **is directly reachable via any Poison-type move's secondary poison proc** (Twineedle, Poison Sting, Sludge, ...) or via Poison Point/Effect Spore on contact — not chased further here since B6 (Toxic) already gives a live-verified flat-tick sibling | 0 (live-verified for burn; poison shares the identical `BattleScript_DoTurnDmg` tail) | `maxHP/8`, floor, min 1 | `BattleScript_PoisonTurnDmg` → `DoStatusTurnDmg` → `DoTurnDmg` | **ORWORD** only (rest in §0) |
| B6 | `ENDTURN_BAD_POISON` (Toxic) | **yes** — 27 Frontier MOVE_TOXIC carriers (ARIADOS, ARTICUNO, BAYLEEF, ...) | 0 (live-verified, §2b) | `maxHP/16 * toxicCounter`, counter increments 1..15 then holds, floor, min 1 | same `DoTurnDmg` tail | **ORWORD** only |
| B7 | `ENDTURN_BURN` | **yes** — 10 MOVE_WILL_O_WISP carriers (BANETTE, DUSCLOPS, GARDEVOIR, ...) plus any Fire-move burn proc | 0 (**live-verified**, §2a) | `maxHP/8`, floor, min 1 (**live-confirmed exact value**, §2a) | `BattleScript_BurnTurnDmg` → `DoStatusTurnDmg` → `DoTurnDmg` | **ORWORD** only |
| B8 | `ENDTURN_NIGHTMARES` | **yes** — 2 MOVE_NIGHTMARE carriers (HAUNTER, HYPNO) — requires the target already asleep | 0 | `maxHP/4` via the SAME `DoTurnDmg` tail | `BattleScript_NightmareTurnDmg` → `DoTurnDmg` | **ORWORD** only (shared with B5-B7) |
| B9 | `ENDTURN_CURSE` | **yes** — 16 MOVE_CURSE carriers (DUSCLOPS, EXEGGUTOR, FLAREON, ...) — Ghost-type user only, real curse status (not the stat-move branch) | 0 | `maxHP/4` via the SAME `DoTurnDmg` tail | `BattleScript_CurseTurnDmg` → `DoTurnDmg` | **ORWORD** only |
| B10 | `ENDTURN_WRAP` | **yes** — 5 MOVE_WRAP + 2 MOVE_BIND + 7 MOVE_FIRE_SPIN + 1 MOVE_CLAMP + 4 MOVE_WHIRLPOOL + 1 MOVE_SAND_TOMB carriers | 0 | `maxHP/16` while trapped, `status2 -= WRAPPED_TURN(1)` | `BattleScript_WrapTurnDmg` → `DoTurnDmg`, or `BattleScript_WrapEnds` | **PLAYANIMATION, ORWORD** for the damage branch; `WrapEnds` itself needs nothing new |
| B11 | `ENDTURN_UPROAR` | **yes** — 3 carriers (DODUO, VIGOROTH, WHISMUR) | 0 | wakes sleeping battlers, decrements uproar counter | `BattleScript_MonWokeUpInUproar`/`PrintUproarOverTurns` | none — both scripts fully covered by §0 |
| B12 | `ENDTURN_THRASH` | **yes** — 2 MOVE_THRASH + 5 MOVE_PETAL_DANCE + 2 MOVE_OUTRAGE carriers | 0 | decrements lock-confuse counter, may set confusion via `SetMoveEffect` | `BattleScript_ThrashConfuses` | **CHOSENSTATUS2ANIMATION** (distinct from the already-registered `CHOSENSTATUSANIMATION`) |
| B13 | `ENDTURN_DISABLE` | **yes** — 9 MOVE_DISABLE carriers (ALAKAZAM, DEWGONG, DROWZEE, ...) | 0 | clears `disabledMove`/`disableTimer` | `BattleScript_DisabledNoMore` | none |
| B14 | `ENDTURN_ENCORE` | **yes** — 7 MOVE_ENCORE carriers (CLEFAIRY, DEWGONG, MINUN, ...) | 0 | clears `encoredMove`/`encoreTimer` | `BattleScript_EncoredNoMore` | none |
| B15 | `ENDTURN_LOCK_ON` | case always runs, but **the effect body is dead code in Factory** — zero Frontier carriers of MOVE_LOCK_ON or MOVE_MIND_READER (the only two ways to set `STATUS3_ALWAYS_HITS`) | 0 | `gStatuses3` decrement | none (no `BattleScriptExecute` call at all — pure C decrement) | n/a |
| B16 | `ENDTURN_CHARGE` | reachable (MOVE_CHARGE exists as a real move; not cross-checked against carriers since it's a pure-C decrement with no script) | 0 | `gDisableStructs.chargeTimer` decrement, clears `STATUS3_CHARGED_UP` | none | n/a |
| B17 | `ENDTURN_TAUNT` | **yes** — 2 MOVE_TAUNT carriers (MIGHTYENA, MURKROW) | 0 | `gDisableStructs.tauntTimer` decrement | none (pure C) | n/a |
| B18 | `ENDTURN_YAWN` | **yes** — 14 MOVE_YAWN carriers (GULPIN, QUAGSIRE, SLAKING, ...) | **1 — the ONLY Random() call site in the entire end-turn C machinery**: `(Random() & 3) + 2` for 2-5 turns of sleep (`battle_util.c:1762`) | `status1 \|= SLEEP_TURN(...)` | `BattleScript_YawnMakesAsleep` | none — fully covered by §0 |
| — | `HandleFaintedMonActions` re-entry | always (once any battler's HP hits 0 this turn, from field/battler ticks) | 0 (**live-verified for an end-turn KO**, §2b) | drives `GiveExp`(Factory short-circuit)/`HandleFaintedMon` exactly as `docs/faint-outcome-ground-truth.md` §1 already banked | reuses the already-landed orchestration | **none — already registered** |
| — | `HandleWishPerishSongOnTurnEnd` | Wish: yes (F6's carriers); Perish Song: **yes** — 4 carriers (ALTARIA, JYNX, MISDREAVUS, + 1 more); Future Sight/Doom Desire: Future Sight yes (8 carriers, ABSOL/BARBOACH/GRUMPIG/...), Doom Desire **no** (0 carriers — JIRACHI-only, mythical); Arena judgment: **no** (`BATTLE_TYPE_ARENA` only, not Factory) | 0 | delayed-damage struct decrements, `BattleScript_MonTookFutureAttack`/`PerishSongTakesLife`/`PerishSongCountGoesDown` | see script names | `PerishSongTakesLife`/`CountGoesDown` need nothing new (§0 covers `datahpupdate`/`healthbarupdate`/`tryfaintmon`); `MonTookFutureAttack` needs nothing new either (`accuracycheck`/`goto`/`jumpifbyte`/`printstring`/`waitmessage`, all §0) |

**Net opcode gap across the entire end-turn phase: two genuinely new opcodes**
— **`ORWORD`** (unlocks B1/B4/B5/B6/B7/B8/B9/B10 — eight of nineteen battler
cases plus Wish, by far the single highest-leverage register) and
**`PLAYANIMATION`** (a generic animation-trigger opcode needed by B1/B4/B10;
distinct from the already-registered `ATTACKANIMATION`, which is
move-hit-specific). Two more small, narrow opcodes
(**`COPYWORD`**, **`JUMPIFABILITY`**, **`MANIPULATEDAMAGE`**) are needed only
for Leech Seed's drain-and-heal-the-other-battler shape (B4), and
**`CHOSENSTATUS2ANIMATION`** only for Thrash's post-confusion animation
(B12). Every other reachable case (F2/F3/F5/F7-F10, B11/B13/B14/B18, the
Wish/Perish/Future-Sight scripts, and the entire `HandleFaintedMonActions`
re-entry) needs **zero** new opcodes — the §0 set already covers them.

## 2a. Live ledger: end-turn BURN (non-KO, recurrence proven)

Scenario: `tools/battle-lab/mechanic-endturn-burn-off.json` — player BANETTE
(`MOVE_WILL_O_WISP` ×4, a real Factory rental moveset carrier) vs. opponent
SUNKERN (`MOVE_SPLASH` ×4, chosen specifically so the opponent's own action
draws **zero** RNG and can't pollute the burn-tick ledger — unlike an
earlier draft of this probe that used Confuse Ray filler and had to be
redone). `overrides.parties`, Level 50, seed 1.

| Event | Frame | opponent HP | status1 | rngValue |
| --- | -: | -: | -: | -: |
| Before Will-O-Wisp | 482 | 105/105 | 0 | 3690816045 |
| **Will-O-Wisp lands** | 483 | 105/105 | 16 (`STATUS1_BURN`) | 3690816045 |
| Before tick 1 | 861 | 105/105 | 16 | 3690816045 |
| **End-turn tick 1** | **862** | **92/105** | 16 | 3690816045 |
| Before tick 2 | 2065 | 92/105 | 16 | 1850371763 |
| **End-turn tick 2 (recurrence)** | **2066** | **79/105** | 16 | 1850371763 |

- **Divisor confirmed live: `floor(105/8) = 13`**, exactly matching
  `battle_util.c:1553`'s `gBattleMoveDamage = maxHP / 8`. Both ticks deal
  the identical 13 — burn has no growing counter (unlike Toxic, §2b).
- **RNG ledger: zero `Random()` draws inside either tick** — `rngValue` is
  bit-identical across 861→862 and across 2065→2066. This matches source
  directly: `Cmd_healthbarupdate`/`Cmd_datahpupdate`/`Cmd_tryfaintmon`(the
  no-faint branch)/`Cmd_checkteamslost` all have zero `Random(` call sites
  (grepped), and `orword` is a pure bitwise write.
  `rngValue` *does* change between ticks (3690816045 → 1850371763 by frame
  2065) — that's the six intervening turns' own hit-chain + AI-rescoring
  rolls, same attribution pattern as `docs/faint-outcome-ground-truth.md`
  §2b, not part of the end-turn machinery itself.
- **Frame relationship to the last action:** the tick lands with **no
  further controller input processed in between** the burn-inflicting hit
  and the tick itself (frame 483 → 862, one continuous `rngValue`-stable
  span aside from that turn's own hit-chain settling) — i.e. the tick is
  the tail of the SAME turn's resolution, strictly before the next turn's
  own action-selection frame, exactly per the `BattleTurnPassed` control
  flow in §1.
- **Party-record HP sync confirmed live**: at frame 862,
  `state.parties.opponent[0].hp === 92 === state.battlers.opponent.hp` —
  the same live-sync mechanism `docs/set-move-effect-ground-truth.md` §2
  already pinned for `status1`, now confirmed for the HP write too.

## 2b. Live ledger: end-turn KO (non-terminal — proves `HandleFaintedMonActions` reuse)

Scenario: `tools/battle-lab/mechanic-endturn-toxic-ko-off.json` — player
ARIADOS (`MOVE_TOXIC` ×4) vs. opponent SHEDINJA (`MOVE_SPLASH` ×4) + 2
benched SUNKERN. SHEDINJA's max HP is **always 1** regardless of level/IVs/
EVs (its base HP stat is 1, and the standard HP formula degenerates to 1 for
any level/IV/EV combination at base HP 1 — independent of its Wonder Guard
ability) — chosen deliberately so Toxic's very first tick, which always
deals at least 1 damage (`if (gBattleMoveDamage == 0) gBattleMoveDamage = 1`
applied to `maxHP/16` **before** the counter multiply — so tick 1's
multiplier is already 1, not 0), one-shots it. This is the cheapest possible
live end-turn KO.

| Event | Frame | opponent state | `battleOutcome` | rngValue |
| --- | -: | -: | -: | -: |
| Before Toxic | 478 | SHEDINJA, hp 1/1, status1 0 | 0 | 1850371763 |
| **Toxic lands** | 479 | status1 128 (`TOXIC_POISON`) | 0 | 1850371763 |
| Before tick | 751 | status1 128 | 0 | 1850371763 (mid-turn: that turn's own repeat-Toxic accuracy roll not yet resolved) |
| **Counter increments** | **752** | status1 384 (`TOXIC_POISON \| TOXIC_TURN(1)`), hp still 1 | 0 | 3034451114 |
| Before HP write | 904 | hp still 1 | 0 | 3034451114 |
| **Deferred HP write (same tick)** | **905** | **hp 0** | 0 | 3034451114 |
| Before status clear | 989 | status1 384 | 0 | 3034451114 |
| **`cleareffectsonfaint` clears status1** | **990** | status1 0 | 0 | 3034451114 |
| Switch resolving | 1333 | partyIndex flips 0→1, species still SHEDINJA | 0 | 3034451114 |
| **Switch-in complete** | **1335** | species SUNKERN(191), hp 105/105, partyIndex 1 | 0 | 3034451114 |

- **The counter-increment (frame 752) and the actual HP write (frame 905)
  are separate frames of the same single `BattleScriptExecute` call** — the
  C-side `status1 += TOXIC_TURN(1)` happens synchronously before
  `BattleScriptExecute(BattleScript_PoisonTurnDmg)` even starts, but the
  script's own `printstring`/`waitmessage`/`healthbarupdate` animation
  consumes real frames before `datahpupdate` actually commits the HP. Not
  obvious from source alone — this is a live-only finding.
- **RNG ledger: zero further `Random()` draws from the counter-increment
  (752) through the switch-in completing (1335)** — `rngValue` is
  bit-identical (3034451114) across the entire kill → faint → `getexp`
  Factory short-circuit → `HandleFaintedMon` → `checkteamslost` (redundant,
  same result) → `openpartyscreen`/`switchhandleorder`/`SendOutNew` chain.
  (Frame 751→752 itself is **not** part of this claim — that gap is where
  the turn's own repeated, now-futile Toxic attempt finishes its accuracy
  roll, immediately adjacent to the tick in the same rendered frame.) This
  is the same "RNG-free switch-in" result
  `docs/faint-outcome-ground-truth.md` §2b found for an in-turn KO — now
  confirmed for an end-turn-triggered one too.
- **The fork is non-terminal** (`battleOutcome` stays 0 throughout — 2
  SUNKERN remain on the bench) and completes the **exact same**
  `openpartyscreen BS_FAINTED` → `switchhandleorder BS_FAINTED, 2` →
  `jumpifbattletype BATTLE_TYPE_FRONTIER, ...SendOutNew` path already
  documented in `docs/faint-outcome-ground-truth.md` §1b — **confirms
  `HandleFaintedMonActions` is reused identically regardless of whether the
  fainting hit came from a mid-turn move or an end-turn tick.** The entry
  point differs (inline `checkteamslost` in `BattleScript_DoTurnDmg` vs.
  `moveend`'s C-loop dispatch), but once `HandleFaintedMonActions()` is
  reached, the machinery — and this doc's live proof of it — is identical.

## 3. Weather legality (verified, not assumed)

The brief asked to verify rather than assume "no Factory-legal auto-weather
at L50." **False as stated**: `SPECIES_TYRANITAR` (10 real Frontier rental
entries in `battle-frontier-mons.json`) carries `ABILITY_SAND_STREAM` as its
*only* ability slot (`species_info.h:7473`, `.abilities = {ABILITY_SAND_STREAM,
ABILITY_NONE}`) — every Tyranitar rental has permanent auto-Sandstorm from
the moment it's sent out. Drizzle (`SPECIES_KYOGRE`) and Drought
(`SPECIES_GROUDON`) are both legendary-only and correctly absent from the
Frontier catalog, so *those two* specific abilities are unreachable — but
Sand Stream is not, and temporary weather via `MOVE_RAIN_DANCE`/
`MOVE_SUNNY_DAY`/`MOVE_SANDSTORM`/`MOVE_HAIL` is broadly reachable regardless
(31/26/16/7 real carriers respectively). **Recommendation: include
`ENDTURN_RAIN`/`SANDSTORM`/`SUN`/`HAIL` (F7-F10) in any end-turn
registration slice** — they are real Factory L50 singles content, not a
hypothetical.

## 4. Recommended registration/orchestration slices

Ordered cheapest/most-isolated first, each independently provable with a
direct-construction Tier-1 test before the next depends on it (same
discipline as `docs/faint-outcome-ground-truth.md` §3 and the SetMoveEffect
quartet's RUNG structure in PROGRESS #443):

1. **`ORWORD` (C-side opcode, trivial).** A pure `gHitMarker |= operand`
   bitwise write, structurally identical to the already-registered
   `SETBYTE`/`PPREDUCE`'s scratch-field pattern — no new
   `BattleScriptRulesContext` field, no selector work. This single opcode
   is the highest-leverage register in this entire doc: it unlocks the
   shared `BattleScript_DoTurnDmg` tail, which is 8 of the 19 battler cases
   (Poison, Bad Poison, Burn, Nightmare, Curse, Wrap-damage, plus Ingrain
   and Wish's heal variant) once combined with opcodes already in §0.
2. **The `DoBattlerEndTurnEffects` per-battler orchestration loop
   (C-side, new).** Not an opcode — a new C-side state machine, same
   category as the already-landed `HandleFaintedMonActions` port. Needs:
   the `gBattlerByTurnOrder` walk (already-available primitive, reused from
   turn-order calc), a resumable tracker mirroring `turnEffectsBattlerId`/
   `turnEffectsTracker`, and the per-case guard conditions from §2's table
   (status1 bit checks, `gStatuses3`/`gDisableStructs` timers — all fields
   this engine already models per the faint-outcome doc's confirmation that
   `cleareffectsonfaint`'s battler-scoped fields are already present). Land
   this BEFORE registering individual case opcodes — it's the thing that
   actually calls them, same lesson as the faint doc's §3 ordering.
3. **Burn + Poison + Bad Poison (B5-B7), together.** All three are already
   fully opcode-complete once `ORWORD` (step 1) lands — §0 already has
   `PRINTSTRING`/`WAITMESSAGE`/`STATUSANIMATION`/`HEALTHBARUPDATE`/
   `DATAHPUPDATE`/`TRYFAINTMON`/`CHECKTEAMSLOST`/`END2`/`GOTO`. This is the
   single cheapest, highest-value slice — it's also the one this doc
   live-verified end-to-end (§2a/§2b), including the KO/switch fork. Toxic
   additionally needs the `TOXIC_COUNTER` increment logic (`status1 +=
   STATUS1_TOXIC_TURN(1)`, capped at `TURN(15)`) ported alongside — a plain
   bitfield arithmetic op, no new modeling.
4. **`DoFieldEndTurnEffects` (Reflect/Light Screen/Safeguard, F2/F3/F5) +
   weather (F7-F10).** Zero new opcodes needed (verified in §2's table);
   the field-loop C orchestration (side-scoped, not battler-scoped) is a
   second, smaller state machine sibling to step 2's per-battler loop.
   Weather is genuinely Factory-legal (§3) — do not defer it as
   hypothetical.
5. **`PLAYANIMATION` (small, generic new opcode) → Ingrain (B1), Leech
   Seed (B4), Wrap-damage (B10).** Ingrain is the simplest of the three
   (heal-only, no `tryfaintmon`/`checkteamslost` needed — can't die from
   healing). Leech Seed additionally needs `COPYWORD`/`JUMPIFABILITY`
   (Liquid Ooze)/`MANIPULATEDAMAGE` (damage-sign flip) — bundle those three
   with it, not with Ingrain.
6. **Everything with zero script cost (B11/B13/B14/B15/B16/B17/B18, plus
   Wish/Perish Song/Future Sight).** These need no new opcodes at all
   (B15/B16/B17 don't even call `BattleScriptExecute`) — purely a matter of
   porting the C-side counter/guard logic once step 2's orchestration loop
   exists to host them. Yawn (B18) is the one case anywhere in the entire
   end-turn phase that needs a `Random()` port (`(Random() & 3) + 2`).
7. **`CHOSENSTATUS2ANIMATION` → Thrash (B12).** Isolated, lowest priority —
   only 9 real Frontier carriers total across Thrash/Petal Dance/Outrage,
   and it's the one battler case needing a new opcode not shared with
   anything else in this table.
8. **`ENDTURN_ABILITIES`/`ENDTURN_ITEMS1`/`ENDTURN_ITEMS2`** (B2/B3/B19) are
   explicitly **out of scope for "end-turn orchestration"** — they're
   pure ability/item breadth (Leftovers, Speed Boost, Shed Skin, ...), each
   its own already-recognized future slice, not new end-turn plumbing. The
   orchestration loop (step 2) should call through to wherever that breadth
   eventually lives, the same way it calls through to step 3's status
   ticks — but registering the individual abilities/items is not part of
   this doc's scope.

**What's explicitly NOT scoped here** (per the brief): no `src/` edits, no
actual opcode registration, `ENDTURN_ABILITIES`/`ITEMS1`/`ITEMS2`'s
individual ability/item bodies (breadth work, not orchestration), and
Battle-Scene-ON presentation (this doc used Battle Scene OFF throughout,
matching the side lane's oracle).
