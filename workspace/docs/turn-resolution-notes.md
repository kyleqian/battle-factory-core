# Turn resolution notes (S7 scouting)

Ground-truth dossier for ROADMAP S7: battle 1's turn resolution (Bug Catcher
DESTIN's Grovyle/Murkrow/Pidgeotto vs the player's Onix/Magby/Bayleef).
**Scouting only — no engine code, no extraction.** Sources: `src/battle_main.c`,
`src/battle_script_commands.c`, `src/battle_util.c`, `src/pokemon.c`,
`src/battle_interface.c`, `src/text.c`, `src/menu.c`, `data/battle_scripts_1.s`
(all under `reference/pokeemerald/`). Oracle probes: scratch scripts under
`/tmp/s7-scout/` (not committed, per instructions) — `common.py` (shared
RAM-decode helpers + the reusable button script),
`step1_determinism.py`, `step2_turn1.py`, `step3_hpbar_and_rng.py`. All RAM
addresses below are from `bin/oracle symbols <name>` against the pinned
anchor/reference build.

## 0. Method note: this session's own button script

`docs/battle-bringup-notes.md` §6's exact press-ticks (from a *previous*
session's own scratch trace, not committed) could not be replayed verbatim
because the intra-pick timing it cites (`DOWN` at press-tick 42 minus
popup-open at tick 2 = 40 frames) turned out to be insufficiently documented
to reconstruct blind: a first attempt using a 18-frame open→DOWN gap landed
the cursor's `A` on **SUMMARY** instead of **RENT** (the popup needs ~28-30
idle frames after opening before `DOWN` reliably registers — confirmed by
the validated `RENT_SLOT1` fixture in `tests/ballAnimMultiBall.test.ts`:
`A`(2f), idle(28f), `DOWN`(2f), idle(4f), `A`(2f)) and desyncs the whole
downstream script onto an unrelated screen (POKéMON INFO). This session
built its **own** reconstruction (`common.py`'s `build_segments_to_action_menu`)
using that validated intra-pick pattern for all 3 rental picks plus generous
idle margins (not tight press-ticks) over the gated windows §6 already
documented as input-gated/non-auto-advancing (final YES/NO, "Right this
way", the opponent's overworld speech, "wants to battle") — screenshot- and
RAM-confirmed to land correctly (§1). **This session's absolute frame
numbers are therefore its own and do NOT correspond 1:1 to
`docs/battle-bringup-notes.md` §6's numbers** (this session's action menu
settles at frame 4516 vs. that session's ~5208 — different idle padding,
same destination). Both are valid; future sessions should not assume either
one's frame numbers are load-bearing without re-deriving them the same way
this note and `docs/rent-flow-notes.md` §5 already flag.

## 1. Determinism check (item 1)

Ran the identical button script twice from the canonical anchor
(`oracle.new_session()` between runs, same `EmeraldOracle` instance) through
to the first action menu (this session's frame **4516**). Compared:
- Full `gPlayerParty[0..2]`/`gEnemyParty[0..2]` `struct Pokemon` decode
  (personality, OT id, checksum, nature, IVs, EVs, moves, PP, level, status,
  live stats) — **byte-identical** both runs.
- `gRngValue` (`0x3005d80`) — **identical**: `0x7aecba62` both runs.
- Full 240×160 framebuffer sha256 — **identical** both runs.
- `gTrainerBattleOpponent_A` (`u16` at `0x2038bca`, read via the matching-width
  accessor per `docs/battle-bringup-notes.md` §5's gotcha) — **50 (DESTIN)**
  both runs.

**Confirmed deterministic**, as expected for a fixed button-for-button
replay from the same anchor. Per `docs/battle-bringup-notes.md` §0/§4, this
determinism is contingent on replaying the *exact* same button/idle-frame
script — a different path to battle start (different idle dwell at any of
the 3 gated msgboxes, or a different draft order) shifts the RNG stream
consumed before `FillFactoryTrainerParty`'s `Random32()` nature-rejection
loop and **will change the opponent mons' personality** (and therefore
ability-slot/shininess, though not species/moves/nature/IVs — those are
table-fixed, see below). This was not re-verified with a *second, distinct*
button script this session (out of scope/time) — flagged in §6 Risk list.

## 2. Battle-1 canonical starting state (this session's trace)

RAM-dumped at the settled first action menu (frame 4516), screenshot-confirmed
("What will ONIX do?" / FIGHT BAG POKéMON RUN, GROVYLE opposing at full HP,
ONIX 117/117 — pixel-identical in shape to `docs/battle-bringup-notes.md`
§6's own description of the same moment).

| battler | species | nature | ability# | lvl | HP | Atk | Def | Spd | SpA | SpD | moves |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| player 0 | ONIX | HARDY | 1 | 50 | 117 | 51 | 187 | 76 | 36 | 72 | ROCK_SLIDE, BIND, DRAGON_BREATH, SANDSTORM |
| player 1 | MAGBY | DOCILE | 0 | 50 | 138 | 81 | 43 | 89 | 108 | 61 | FIRE_PUNCH, SMOKESCREEN, CONFUSE_RAY, SMOG |
| player 2 | BAYLEEF | DOCILE | 0 | 50 | 153 | 68 | 86 | 66 | 101 | 86 | RAZOR_LEAF, TOXIC, SAFEGUARD, LIGHT_SCREEN |
| enemy 0 | GROVYLE | RELAXED | 0 | 50 | 143 | 103 | 56 | 90 | 91 | 71 | FURY_CUTTER, ENDEAVOR, BRICK_BREAK, DOUBLE_TEAM |
| enemy 1 | MURKROW | QUIRKY | 0 | 50 | 142 | 91 | 69 | 97 | 91 | 69 | FAINT_ATTACK, FLY, TORMENT, TAUNT |
| enemy 2 | PIDGEOTTO | QUIRKY | 0 | 50 | 156 | 98 | 61 | 77 | 56 | 56 | AERIAL_ACE, QUICK_ATTACK, FEATHER_DANCE, SAND_ATTACK |

Matches `docs/battle-bringup-notes.md` §5's table exactly for all
personality-independent fields. **New finding this session**: the enemy's
exact *battle stats* (HP/Atk/Def/Spd/SpA/SpD) are fully deterministic
despite the personality itself being a genuine `Random32()` roll (§0 of
`battle-bringup-notes.md`) — because `CreateMonWithEVSpreadNatureOTID`'s
rejection loop only re-rolls until the personality's derived *nature*
matches the table-fixed target, and IVs are separately forced to the
table-fixed `fixedIV=3` (all stats) regardless of personality; nature + IVs
+ EVs + base stats + level fully determine the stat block, so personality
only affects things this dossier's scope doesn't need (ability slot when a
species has 2 abilities — none of battle 1's 6 mons do per
`species_info.h`'s single-ability entries for these 6; and cosmetic
shininess). **Practical consequence: Tier-1 tests can pin the exact stat
numbers above as constants for battle 1 without needing to model the
personality roll at all**, even though the roll itself is real (contradicts
a naive reading that "non-deterministic personality" implies
"non-deterministic stats" — it doesn't, for this fixed-IV/fixed-nature
factory context).

Opponent stat-stages and status all read `DEFAULT_STAT_STAGE` (6, neutral)
and `status1=0` at the menu — expected, nothing has acted yet.

## 3. Turn 1, RAM-truthed (item 2)

Scripted: `A` (open action menu → FIGHT is the default cursor position),
idle 30 frames, `A` (select move slot 0 — cursor defaults there; FIGHT
submenu screenshot-confirmed: `ROCK SLIDE` highlighted, PP `10/10`, `TYPE/ROCK`
in the corner, matching Onix's dumped moveset slot 0). Only the **player's**
move choice is scripted; the opponent's move is AI-selected (Factory AI,
out of this dossier's scope) — this session observed rather than dictated
Grovyle's choice.

**Turn order**: Grovyle (speed 90) acts before Onix (speed 76) — both moves
priority 0 (`FURY_CUTTER`/`ROCK_SLIDE`), so `GetWhoStrikesFirst`
(`battle_main.c:4595-4754`) falls to the plain speed comparison
(`battle_main.c:4747-4748`, no stat-stage/item/status modifiers apply to
either — both neutral stage, no held item affecting speed, no paralysis);
the `Random()&1` tie-break (`:4728`/`:4745`) never fires since 90≠76. Cross-
battler tie-break coverage note in §6 Risk list.

**Grovyle's move** (`gLastMoves[1]` RAM-read post-turn: `MOVE_FURY_CUTTER`,
the AI's own pick, matches this dossier's assumption of "opponent uses its
first listed move" only coincidentally — not verified as a general AI rule):
- `Random()`-consuming events (via `gRngValue`, one LCG step per event,
  confirmed by replaying the known LCG from the pre-event value and counting
  steps to the post-event value): 3 events, frames 4588/4590/4594 (each
  exactly 1 step) — matches `MOVE_FURY_CUTTER`'s `secondaryEffectChance = 0`
  (`data/battle_moves.h:2733-2744`): **accuracy** (`Cmd_accuracycheck`,
  `battle_script_commands.c:1099-1189`, `(Random()%100+1) > calc`), **crit**
  (`Cmd_critcalc`, `:1253-1288`, `!(Random() % sCriticalHitChance[critChance])`
  with `critChance=0` → `sCriticalHitChance[0]=16` → **1/16 baseline**,
  `:606`), **damage spread** (`ApplyRandomDmgMultiplier`,
  `:1638-1651`/`Cmd_adjustnormaldamage:1658`, `100-(Random()%16)`, 85-100%
  inclusive) — no 4th roll, matching `secondaryEffectChance=0`.
- **Damage dealt: 3** (Onix 117→114, `gBattleMons[0].hp` RAM-read, single-frame
  jump at frame 4672 — see §4 for why the HP stat and the visual bar update
  on different frames). Verified against `CalculateBaseDamage`
  (`pokemon.c:3106-3282`) with this exact matchup's RAM-dumped inputs
  (attack 103, defense 187, power 10, level 50, no STAB [Grovyle is pure
  GRASS, move is BUG], BUG-vs-ROCK/GROUND both neutral per
  `gTypeEffectiveness[]`, `battle_main.c:335-` — no `TYPE_BUG,TYPE_ROCK` or
  `TYPE_BUG,TYPE_GROUND` entries, meaning default 1x): base formula gives
  **2** damage pre-spread, which alone caps out at 2 after an 85-100% spread
  — too low to reach 3. Resolved by re-deriving with the **crit** branch
  live (`Cmd_damagecalc:1296`, `gBattleMoveDamage * gCritMultiplier`): base
  2 × crit 2 = 4, spread 85-99% of 4 floors to **3** (100% would give 4) —
  **this was a critical hit** (the 1-in-16 roll landed on this session's
  first probe), fully consistent with all 3 RNG events *and* the observed
  damage number. `Cmd_furycuttercalc` (`:8580-8601`) confirmed **not** yet
  doubling power on a first use (`furyCutterCounter` increments to 1 *before*
  the `for (i=1; i<counter; i++)` doubling loop, which doesn't execute at
  counter=1) — power stayed the table value (10), not a doubling-related
  red herring.

**Onix's move** (player-chosen `MOVE_ROCK_SLIDE`, slot 0):
- 4 `Random()` events, frames 4677/4691/4715/4718 (1 step each) — matches
  `MOVE_ROCK_SLIDE`'s `secondaryEffectChance = 30`
  (`data/battle_moves.h:2044-2055`, `EFFECT_FLINCH_HIT`): accuracy, crit,
  damage spread, **plus** a 4th roll for the 30%-chance flinch effect (site
  not individually re-derived this session — `data/battle_scripts_1.s`'s
  `seteffectwithchance`-equivalent cmd, not read this pass; flagged in §6).
  Grovyle did not visibly flinch on its own next action (moot here — battle
  ended after 1 turn's worth of probing) so the roll's outcome wasn't
  cross-checked either way.
- **Damage dealt: 42** (Grovyle 143→101, single-frame jump at frame 4834).
  Verified: attack 51, defense 56, power 75, level 50, **STAB applies**
  (Onix is ROCK/GROUND, move is ROCK — `Cmd_typecalc:1355-1371`, `if
  (IS_BATTLER_OF_TYPE(...)) damage = damage*15/10`), ROCK-vs-GRASS neutral
  (no `TYPE_ROCK,TYPE_GRASS` entry). Base formula: attack(51)×power(75)=3825,
  ×(2×50/5+2)=22 → 84150, /defense(56)=1502, /50=**30**. STAB: 30×15/10=**45**.
  Random spread 85-100% of 45 → range 38-45; **42** falls inside (no crit
  needed — a 2× crit would push the range to 76-90, far above 42),
  consistent with `gCritMultiplier=1` for this hit.
- Exact per-roll RNG outputs (which specific `Random()%16`/`%100` value
  produced 42, or which frame is the flinch-chance roll specifically) were
  **not** individually decoded this session (would need each raw `Random()`
  u16 output, not just the post-step `gRngValue`) — flagged in §6.

**Turn-end tail**: 3 more `Random()` events after Onix's hit lands (frames
4839/4849, then 2-step and 5-step jumps at 4854/4856 — i.e. 2 and 5
*consecutive* LCG steps happened within the same emulated frame, unlike
every other event this session which was exactly 1 step/frame). Total: **16
LCG steps this turn** (3+4+1+1+2+5). The last 3 events (9 steps) are **not
yet mapped to a specific `Cmd_`/source call site** — plausible candidate
(not confirmed): Factory AI scoring the opponent's *next* turn's move
(`battle_ai_script_commands.c`, which itself calls `Random()` for viability
jitter/simulated-damage-spread during scoring) running speculatively before
the action menu reappears, since these events land strictly after both
hits resolve and before the menu re-settles. Flagged as an open item, §6.

**Timing**: menu→FIGHT-submenu-select happens instantly (no RNG cost, §5);
Grovyle's hit RNG resolves by frame 4594, HP applies at 4672 (78-frame gap —
message printing + animation, not RNG-gated); Onix's hit RNG resolves by
frame 4718, HP applies at 4834 (116-frame gap, same reason); `gRngValue`
goes fully flat at frame 4856 and **stays flat for the rest of this
session's ~1100-frame idle tail at the resettled menu** (see §5). Next
action menu ("What will ONIX do?", HP now 114/117, screenshot-confirmed)
settles by ~frame 4855-4870 — full turn-1 wall-clock from move-select to
next-menu-ready: **~305 frames** (4550→4855).

**Scope note**: only turn 1 was fully RAM-truthed this session (1 of the
brief's requested "2-3" turns) — ran out of session time budget after the
determinism check, the button-script reconstruction (§0), and this turn's
dense multi-probe analysis. Turns 2-3 (which would exercise Onix vs.
Murkrow/Pidgeotto after Grovyle presumably faints or switches, or continued
Grovyle exchanges) are unprobed. This is flagged, not hidden, in §6.

## 4. HP-bar drain schedule (item 4) — RAM-pinned, 2 independent data points

`gBattleSpritesDataPtr` (`0x20244d0`) → deref → `+0xC` is
`struct BattleBarInfo *battleBars` (`include/battle.h:580-586,594`);
`battleBars[battlerId]` is `{u8 healthboxSpriteId; [pad3]; s32 maxValue,
oldValue, receivedValue, currValue;}` (20 bytes/entry). `MoveBattleBar`
(`battle_interface.c:2238-2273`) calls `CalcNewBarValue(maxValue, oldValue,
receivedValue, &currValue, B_HEALTHBAR_PIXELS/8, 1)` — **the literal `1` is
the fixed `toAdd` argument for the "plain integer" branch**
(`CalcNewBarValue`, `:2334-2408`), taken whenever `maxValue >= scale`
(`scale = (B_HEALTHBAR_PIXELS/8)*8 = 48`; true for every battle-1 mon, all
maxHP ≥ 117). In that branch `*currValue -= toAdd` (`:2403`) each call — a
**flat 1 HP-unit decrement per call**, clamped at `newValue`.

**Confirmed the call cadence is exactly once per emulated frame** (not
once per N frames, not variable-rate): both probed hits show `currValue`
decrementing by exactly 1 every single frame, no skips:
- Onix's 3-damage hit (battler 0): sentinel (`-32768`, the "first call"
  flag) at frame 4667, `116/115/114` at frames 4668/4669/4670 (3 frames for
  3 damage), zeroed-out "done" sentinel at 4671, **`gBattleMons[0].hp`
  itself updates to 114 one frame later, at 4672**.
- Grovyle's 42-damage hit (battler 1): sentinel at frame 4790, `142`
  down to `101` at frames 4791-4832 inclusive (**exactly 42 frames for 42
  damage**), zeroed-out at 4833, **`gBattleMons[1].hp` updates to 101 one
  frame later, at 4834**.

**Step rule, confirmed**: for any battle-1 mon (maxHP ≥ 48), the bar drains
at **exactly 1 HP unit per frame**, so drain duration in frames == the
exact damage number. (The alternate Q24.8 fractional-step branch only
applies when `maxHP < 48`, impossible at level 50 for any of these 6 mons —
noted as a non-issue for battle 1, flagged for later stages if smaller/lower-level
mons ever enter scope.)

**Non-obvious ordering, worth flagging explicitly for implementation**: the
visual bar's own animation **fully completes 2 frames before**
`gBattleMons[].hp` (the authoritative stat) updates to its new value — i.e.
the bar does *not* animate away from an already-updated stat; the stat
snaps to match the bar 1 frame after the bar's "done" sentinel. A naive
implementation that updates `hp` first and merely *renders* a lagging bar
off of it would diverge from this exact frame-by-frame sequencing (though
likely not from the final visual result) — matters if anything reads
`hp` mid-drain (e.g., a simultaneous text placeholder showing the numeric
HP, or a script branch checking faint status early).

## 5. In-battle RNG cadence at idle (item 5) — confirmed

`gRngValue` was sampled every frame through two long idle windows:
- **At the first action menu** (frame 4516) through FIGHT-submenu-open and
  30 idle frames (to frame 4548): **flat at `0x7aecba62`**, zero advances —
  navigating the action menu / opening the FIGHT submenu costs no RNG.
- **At the resettled post-turn-1 menu**: flat at `0xad03bf2` from frame 4856
  through at least frame 5950 (this session's capture tail, ~1094 frames of
  pure idle, no input) — zero advances.

This directly **reconfirms** `ROADMAP.md` Domain notes' rule (`main.c:366`,
`if (!gMain.inBattle || !(gBattleTypeFlags & (BATTLE_TYPE_LINK|
BATTLE_TYPE_FRONTIER|BATTLE_TYPE_RECORDED))) Random();` — the frontier-battle
branch suppresses the per-VBlank draw entirely) with a live, dense,
independent per-frame diff spanning both an early-battle and a post-turn
idle window, not just a single checkpoint. **Nothing observed advances
`gRngValue` while idling at a battle-1 action menu** — no periodic sprite
animation, no idle-cursor tick, nothing. All RNG movement this session was
tied 1:1 to specific battle-script commands (accuracy/crit/damage/secondary
rolls, §3) or the (unmapped) turn-end cluster.

## 6. Ranked risk list for S7 implementation

1. **Damage-formula bit-exactness is unverified beyond 2 hand-checked
   cases.** This session's own manual reapplication of `CalculateBaseDamage`
   to the Fury Cutter hit *initially* mismatched RAM ground truth (predicted
   ≤2, observed 3) until a critical hit was identified as the missing
   factor — a real near-miss, not a hypothetical one. **Probe:** before S7
   pins Tier-1 damage tests, reimplement `CalculateBaseDamage` +
   `Cmd_critcalc` + `ApplyRandomDmgMultiplier` + `Cmd_typecalc`'s STAB/type
   steps bit-for-bit and regression-test against these exact two RAM-pinned
   cases (Fury Cutter: atk103/def56/pow10/lvl50/crit×2/no-STAB/neutral-type
   → 3; Rock Slide: atk51/def56/pow75/lvl50/no-crit/STAB/neutral-type → 42)
   plus fresh RAM dumps of Onix's other 3 moves and at least one hit each
   from Magby/Bayleef/Murkrow/Pidgeotto before trusting the formula for the
   full battle-1 moveset.
2. **9 of this turn's 16 `Random()` steps (the frame-4839/4849/4854/4856
   cluster) are not mapped to a source call site** — only a plausible,
   unconfirmed guess (opponent AI scoring its next move) is offered in §3.
   **Probe:** re-run this exact turn with a source-level trace/breakpoint
   (or bisect via selectively no-op'ing candidate `Random()` call sites in
   a scratch ROM patch, if that's available) to attribute each step exactly
   — needed before a Tier-1 test can assert "this many RNG steps happen
   this turn" as a hard invariant rather than an observed number.
3. **Only 2 of battle 1's 8 distinct moves actually used across both
   sides this session were exercised** (`FURY_CUTTER`, `ROCK_SLIDE`) — the
   other 6 (`BIND`, `DRAGON_BREATH`, `SANDSTORM` for the player;
   `ENDEAVOR`, `BRICK_BREAK`, `DOUBLE_TEAM` for Grovyle; all of Murkrow's
   and Pidgeotto's 4 moves each) have distinct RNG footprints not yet
   probed: status-move-only turns (`DOUBLE_TEAM`, `SANDSTORM`) skip
   accuracy/crit/damage-spread entirely (need to confirm exactly which
   rolls a pure-status move *does* still consume, if any); `DRAGON_BREATH`
   has a paralysis-chance secondary effect (RNG shape like Rock Slide's
   flinch, different `secondaryEffectChance`); `BIND` is multi-turn-trap
   (unknown extra RNG for turn-count rolling, standard gen3 pattern is
   `(Random() % 4) + 2` or similar — not verified against this build's
   actual constant); `ENDEAVOR` sets HP to a formula, not the normal damage
   calc (may skip the damage-spread roll entirely). Each needs its own
   scripted-turn probe before S7 can claim full battle-1 moveset coverage.
4. **Speed-tie RNG (`Random()&1` in `GetWhoStrikesFirst`) was never
   exercised** — none of the 3v3 matchup's 9 possible active-pairings tie
   on speed (spot-checked from §2's table: 76/89/66 vs 90/97/77, no exact
   matches) — but this needs an *exhaustive* check across all 9 pairings
   (not just the turn-1 pairing) before concluding the tie-break branch is
   provably dead code for battle 1; if truly never reachable, S7's Tier-1
   suite should still unit-test the branch directly (bypassing the
   oracle) since no committed trace will ever exercise it.
5. **Text-printing cadence depends on this run's specific save's
   `optionsTextSpeed`**, RAM-confirmed **`FAST` (2)**, not the more
   commonly-assumed default `MID` — `sTextSpeedFrameDelays[FAST] = 1`
   (`text.c:77-82`) means **1 char printed per 2 frames** (`delayCounter`
   starts at 1, `RenderText`'s `RENDER_STATE_HANDLE_CHAR` case,
   `text.c:934-965`), not the 1-char/5-frame `MID` rate. Any future engine
   hardcoding `MID` will desync every battle-text timing check against this
   canonical save. (`GetPlayerTextSpeedDelay`, `menu.c:481-488`; gated by
   `gBattleTypeFlags & (LINK|RECORDED)` only — our Factory battle uses the
   player's own save setting, `battle_message.c:3011-3016`.)
6. **This session's button script (§0) is a fresh reconstruction, not a
   verified replay of `docs/battle-bringup-notes.md`'s own numbers** — the
   two sessions' absolute frame numbers are not directly comparable. A
   future session implementing S6+S7 together should re-derive one
   consistent canonical script (or explicitly document the chosen one) so
   Tier-1/Tier-2 fixtures don't silently accumulate two incompatible
   "canonical" traces.
7. **Determinism was checked only for one button script, replayed
   twice** — not cross-checked against a *second, distinct* script that
   reaches the same battle-1 first-action-menu state via different idle
   padding (which `docs/battle-bringup-notes.md` §0 predicts *would* change
   the RNG stream and therefore the opponent's rolled personality, though
   not, per §2's new finding, its battle-relevant stats). Worth a follow-up
   probe explicitly demonstrating personality drift + stat stability
   together, to make the "stats are stable, personality isn't" claim fully
   airtight rather than inferred from source + one trace.
8. **HP-bar drain rule (§4) was confirmed for exactly 2 hits, both within
   the `maxHP ≥ 48` branch** — the alternate Q24.8-fractional branch
   (`maxHP < 48`) is cited from source but never RAM-observed (no battle-1
   mon qualifies). Low risk for S7 specifically (all 6 mons are level 50
   with maxHP ≥ 117) but would matter the moment any lower-level/lower-HP
   mon enters scope (S9+).
