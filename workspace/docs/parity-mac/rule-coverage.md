# The finer tally: rule code that no ROM-matched battle has run (fifth pass)

Not a battle-rule fix. The tally (`tally.md`) counts named effects. This list is finer: it names every piece of the
engine's battle-rule code that no battle which matched the real ROM has ever executed. A piece of rule code that never
ran in a matching battle has never been compared with the game.

Tool: `tools/audio/romReplayCoverage.py` (`collect`, `merge`, `report`, `diff`, `selfcheck`).
The classification: `docs/parity-mac/rule-coverage-classes.json`. The list by rule: `rule-coverage-list.md`.

## How it is measured

- The engine side of a replay is deterministic. `collect` replays, engine side only, every battle of the given
  directories whose summary says `match` (same setup file, same player, same frame budget), with V8's precise block
  coverage (`NODE_V8_COVERAGE`). A battle counts only when the new replay has the summary's number of turn states and
  decisions and its outcome; else it is dropped and named. No ROM time is needed.
- Per source file two maps are kept, one cell per character: `seen` (V8 reported a range over the character) and `hit`
  (the innermost range over it had a count above 0 in some battle). A function that never ran is reported by V8 with
  count 0, so it is in the list too. An "uncovered piece" is a run of characters, inside one function, that are seen
  and never hit: a function that never ran, or one arm of a branch that never ran.
- **The offsets are offsets into the `.ts` file.** Node's `--experimental-strip-types` replaces type syntax by blanks, so
  the positions do not move. Proof on one known branch (`selfcheck`): in `ppreduce`
  (`src/engine/battleScriptHitChainOpcode.ts`) the arm `: withActivePp` runs only for a Transformed or Mimic move user
  (fix 36). V8 reports the range 61003..61017, whose text in the `.ts` file is exactly `: withActivePp`, with count 0
  in the ordinary battle 20101 (`ai-v1`) and count 20 in the staged battle `metronome-transform` (lab seed 50110), in
  which Chansey uses the moves of a Pokemon it Transformed into. A second check: of 3,494 named functions in the
  report, 3,477 have their name in the `.ts` text at the reported start (the rest are getters and class members whose
  range starts at a modifier).
- **Scope: 134 files** of `src/engine/` (the list `RULE_PATTERNS` in the tool): every `battleScript*.ts` (the script
  machine, the opcode handlers, the rules context, turn admission, move end, switch-in, faint handling), the end-turn
  orchestration, damage, stats, turn order, the RNG, the trainer AI (`factoryAi*.ts`, `battleAiSwitchInto.ts`), the
  turn decision reducers (`factoryBattleScript*Decision.ts`), battle start, the decision boundary, the party order.
- **Left out:** presentation, animation, sound, screens and menus; `factoryRoundBattleOrchestrator.ts` (it sequences
  the screens of a battle around the rules); the round flow; rental and opponent generation (the replay checks those
  against the ROM's own read-back of the parties); the loader of the script program and the constants; and `core.ts`,
  the app shell. The replay enters the engine below `core.ts`, so `core.ts` is not even loaded: nothing of the menus
  and screens a player goes through between battles is in any replay.

## The three classes

- **(a) cannot occur** in a Factory Level 50 singles battle: a real rule whose condition is impossible here (double
  battles, wild or link battles, a move that no set has and Metronome cannot call, an ability or item no set has).
  Each has its source reason.
- **(b) not a battle rule**: presentation, tools, error paths. The engine's own stops (a `throw`, an "unsupported"
  return) are put here by pattern: a battle that reached one would end as an engine error in the replay, and no
  battle of the lists does.
- **(c) reachable**: everything else. When the reason for (a) or (b) could not be pointed to, the piece is (c).

## Which battles count

- Every matching battle of the lists (engine `b36f7b6c9`): the fourth pass's final run (the proof list, the mixed
  list, the pool of 962, the Brain lists, the eighth-challenge list, the former lab failures, the staged battles, the
  Metronome sweep, with the long-cap re-drives: 3,534), the Scene ON list of the fourth pass (500), discovery batch 1
  (992), the 320 Metronome shapes and the six new stage files of this pass: **5,352 battles, none dropped** (each
  replay reproduced its summary's states, decisions and outcome). The battles that only reached a frame cap are not in
  it.
- **The trainer AI files count only the 2,903 of them without the `ai-v1` player.** `ai-v1` runs the same AI code for
  the player's side, and always with all three scripts, so it scores sets that the game's AI never scores (the AI
  scripts run from the third challenge on, all three from the fifth). Code that only `ai-v1` ran was never compared
  with the game's own AI decision.
- The list is made on the source of engine `b36f7b6c9`. Fix 41 (found from this list) changed one function,
  `runCvForesight`; its staged proof battle runs the changed code.

## Result

1,933 pieces of rule code in 132 files were never run by a counted battle (150 functions never called, the rest one
arm of a branch). Classified:

| class | pieces | rules | |
|---|---|---|---|
| (a) cannot occur in a Factory Level 50 singles battle | 290 | 163 | double battles, wild / link / Arena / Palace scripts, experience and money, Wonder Guard and other abilities no set has, items no set holds (Enigma Berry, Light Ball, Lucky Punch, ...), moves no set has that the AI would have to score, moves only below the third challenge (where the AI scores nothing), Snatch and Sketch |
| (b) not a battle rule | 1,445 | 172 | 919 by pattern: engine stops and operand checks (811), the engine's "not implemented" stops (58, each classified in `docs/barrier-reachability-triage.md`), comments (50); and 526 by reading: defensive fallbacks for values that are always given, operand forms the committed scripts never use, presentation (messages, animations), helpers only tests call |
| **(c) reachable** | **198** | **110** | 29 rules a player meets uncommonly, 81 rarely; **none commonly** |

The (c) pieces: 134 in the battle scripts and the turn flow, 64 in the trainer AI. The 29 uncommon rules: Endure
against a fixed-damage move, Focus Energy used twice, a Hyper Beam recharge that wears off while asleep, Immunity
against Poison Fang, sleep moves during an Uproar, Pain Split against a Substitute, Pursuit knocking out a switching
Pokemon, Shield Dust against King's Rock, Sticky Hold against Trick, a Thrash lock that ends because the user could
not move, a battle that ends in a draw, a battle that ends on Leech Seed; and seventeen AI scores (for example
Smelling Salt against a paralysed target, Sweet Scent, Charm against Hyper Cutter, Superpower at low HP). The whole
list with what each needs: `rule-coverage-list.md`.

**Covered so far (box hunt rrh1, 2026-11-14): 37 of the 110** have a staged battle in `stages/coverage/` that ran the rule's piece
and matched the ROM to the end (the Mac lane's 12 and the box's 25: R001..R010, R012, R021, R026, R027, R028, R034, R036, R041..R048).
**R019 (Focus Energy used twice) is class (b), not (c):** `BattleScript_EffectFocusEnergy` (`data/battle_scripts_1.s:885-890`) has
`jumpifstatus2 BS_ATTACKER, STATUS2_FOCUS_ENERGY, BattleScript_ButItFailed` at line 889, before `setfocusenergy` at line 890,
so the "already set" branch of `Cmd_setfocusenergy` (`battleScriptSetfocusenergyOpcode.ts`) is dead code: no script reaches it with the
bit set. That leaves **72 of the 110 not covered** (R019 counted out). See `STATUS.md`, "Box hunt 2026-11-14 (rrh1)".

**Box hunt rrh2 (2026-11-14): 49 of the 110 covered, four now class (b), 57 left.** Twelve more rules have a staged battle in
`stages/coverage/` that ran the piece and matched the ROM to the end: R054, R060, R066, R070, R074, R084, R087 (with R089), R088,
R089, R092, R093, R102. Three of the designers' "cannot occur" notes were checked against the decomp and move to class (b):

- **R029 (battle ends on Leech Seed damage): dead code.** `BattleScript_LeechSeedTurnDrain` (`data/battle_scripts_1.s:3265-3285`)
  has no `checkteamslost` (compare `BattleScript_DoTurnDmg`, `:3741-3746`). `gBattleOutcome` is written only by `Cmd_checkteamslost`
  (`battle_script_commands.c:3564`, `:3577`), teleport (`:6489-6491`) and the forfeit / run / link paths (`battle_main.c:1874`,
  `:5061`, `:5067`; `battle_util.c:481-535`, `:622`). The engine branch is `battleEndTurnOrchestration.ts:1653`.
- **R031 (a fainted attacker's move skipped at `Cmd_attackcanceler`): unreachable.** The check is `battle_script_commands.c:924-929`
  (engine `battleScriptActionAdmission.ts:4016`, `:4020`). Every action ends through `Cmd_end` / `Cmd_end2` (`:3957`, `:3963`) →
  `HandleAction_TryFinish` (`battle_util.c:638-645`) → `HandleFaintedMonActions` (`battle_util.c:1894-1985`), so the replacement is in
  before the next action; the replacement switch-in sets `B_ACTION_CANCEL_PARTNER` (`battle_script_commands.c:5268-5273`); the last mon
  is handled by `checkteamslost`, and `Cmd_attackcanceler` `:919` and `battle_main.c:4939` end the turn. Pursuit (`:8752`) hits a live user.
- **R033 (a stat-lowering move fails against a protected target; `battleScriptStatBuffs.ts:235`, `:262`): unreachable in singles.**
  `ChangeStatBuffs` (`battle_script_commands.c:6981-6986`) uses `JumpIfMoveAffectedByProtect` → `DEFENDER_IS_PROTECTED` (`:57`), but
  `Cmd_attackcanceler` (`:992-1000`) has already cancelled every protect-affected move. The exceptions never reach the branch:
  two-turn first turns, Curse, Intimidate (`battle_scripts_1.s:4033`), `accuracycheck` (`:1109`, `:1123`) and Memento (`battle_scripts_1.s:2206`).

**Box hunt rrh3 (2026-11-14): 50 of the 110 covered, four class (b), 56 left.** One more rule has a staged battle in `stages/coverage/`
that ran the piece and matched the ROM to the end: R076 (Hi Jump Kick miss against a Ghost; the crash damage floor of 1). R095 (Trace
waiting) was read against the decomp and stays (c): the route the rule text names ends the battle first, but a foe replacement that faints
on entering leaves a Trace holder with no foe at faint-handling state 6 (`battle_util.c:1936-1958`). See `STATUS.md`, "Box hunt 2026-11-14 (rrh3)".

**R035 and R040 (AI Counter / Mirror Coat scored up under Taunt) stay class (c)**: `AI_CV_Counter` (`battle_ai_scripts.s:1618-1637`) uses
`if_target_not_taunted`, so the branch is reachable. But no set from id 267 up has Taunt and only an AI Metronome user (Clefable 389,
Chansey 227) can call it, about 0.1% of lab seeds, and a Mechanic Lab stage is ROM-only (`romReplayWide --stage` cannot drive it). Not stageable
cheaply; left uncovered. See `STATUS.md`, "Box hunt 2026-11-14 (rrh2)".

**Luck step luck1 (2026-11-16): lab designs for the luck-only rules, and the ones left out.** Fourteen designs are in
`tools/replay-hunt/luck-designs/` (R030 R032 R035 R037 R038 R039 R040 R067 R080 R095 R097 R107 R109 R110; since luck3 R039 R067 R095 are retired and R030 is promoted, see "Luck hunt day 2" below), driven by
`tools/replay-hunt/luckHunt.sh`. Left out, with the reason:

- **R106 (bad poison counter stopping at 15): no design, the counter cannot get that far in the pools.** The tick is `maxHP / 16` times
  the counter (`battle_util.c:1538-1543`), so tick n costs n/16 of max HP. The best sustained healing a set has is Recover, Soft-Boiled or
  Milk Drink at half of max HP (`BattleScript_EffectRestoreHp`, `battle_scripts_1.s:672-676`) plus Leftovers 1/16, and Wish also only
  half and not on the turn it is cast. From a full start the Pokemon is dead by tick 13 (HP after the tick and Leftovers, then
  Recover: 100, 93.75, 81.25, 62.5 percent, then tick 13 takes 81.25). Rest and Heal Bell-type cures reset the counter, and a switch resets it.
- **R068 (a frozen Pokemon picks Flame Wheel): no practical design.** Flame Wheel sets are Growlithe 136 (challenge 0) and Quilava 181
  (challenges 0, 1). In challenges 0 and 1 no set has a freezing move: the Ice-move sets there carry only Icy Wind or Aurora Beam
  (`src/data/battle_moves.h:2551-2553` and `:809-811`, speed / attack drops, no freeze); the only route is Chansey 227's
  Metronome calling an Ice move (about 8 moves of 340) and then the 10 percent freeze, well under 0.1 percent per turn.
- **R081 (Memento fails against a target at minimum Attack and Sp. Atk): no design built.** Both stats must be at -6 (`Cmd_trymemento`,
  `battle_script_commands.c:9072`). Attack -6 takes three Charms (Espeon 446, Latias 798) and Sp. Atk -6 takes three Overheats of an
  AI Fire set without White Herb, on a target that must survive all six turns; the only Memento set is Weezing 501 and the AI does not
  use it at -6 (R039 gate), so the user would be the player's Weezing after a switch. Possible in principle, but the chance per seed is far
  below what a hunter can spend.
- **R103, R105, R108: not designed in luck1.** Their blockers are a set-up, not luck (R103 needs a cure berry on a Pursuit user, R105 a
  Synchronize or Serene Grace status forced onto an Immunity / Water Veil / Limber holder, R108 a forced Struggle with a self-KO), and
  need hand-built Mechanic Lab parties.

**Box hunt rrh4 (2026-11-16): 53 of the 110 covered (50 before), R065 now class (b), R069 now class (a), 51 left (four others already class (b)).** Three more rules have a
staged battle in `stages/coverage/` that ran the piece and matched the ROM to the end (clean re-drive, `match True`, `stage.ok True`):

- **R108 (Torment on a Choice Band holder, forced Struggle that is cancelled):** `R108-torment-choice-band-explosion` (lab seed 90000).
- **R105 (a Traced Water Veil blocks a Synchronize burn):** `R105-trace-water-veil-synchronize-burn` (seed 90002).
- **R077 (Sleep Talk calls Thunderbolt against a Lightning Rod foe):** `R077-sleep-talk-thunderbolt-lightning-rod` (seed 90004). The marker is the
  Lightning Rod test of `GetMoveTarget` (`battle_util.c:3854-3856`) in the Sleep Talk handler; in singles the drawn target is the holder itself,
  so the result is always "no redirect" and the test only has to run.

Class moves, each read against the decomp:

- **R065 (Eruption / Water Spout keep an already-set base power): class (b), dead branch.** `BattleScript_EffectEruption`
  (`data/battle_scripts_1.s:2493-2495`) starts with `scaledamagebyhealthratio` and no command runs before it in that script. `gDynamicBasePower`
  is cleared at every turn start (`battle_main.c:4928`) and after every action (`HandleAction_ActionFinished`, `battle_util.c:678`); the AI
  clears it after each damage estimate (`battle_script_commands.c:1312`, `battle_ai_script_commands.c:1188`, `:1472`, `:1519`, `:1751`, `:1780`,
  `battle_ai_switch_items.c:748`); the other writers (`battle_script_commands.c:8314`, `:8559-8706`, `:8905`, `:9477`, and the Triple Kick
  `copyhword` at `battle_scripts_1.s:1401`) belong to their own effect scripts. A called Eruption (Metronome, Sleep Talk, Assist, Mirror Move)
  jumps into Eruption's own script and so also meets 0. `Cmd_scaledamagebyhealthratio` (`battle_script_commands.c:9379-9388`) therefore always
  sees 0, and the engine's "already set" arm (`battleScriptRankedBatch1Opcode.ts:64`) cannot run.
- **R069 (Ghost-type Curse aimed at the user picks a random foe): class (a), cannot occur.** `BattleScript_GhostCurse` takes `getmovetarget`
  only when the target is the user (`battle_scripts_1.s:1512-1513`). Only the player menu aims Curse at the user, and only when the user is not
  Ghost-type at selection (`battle_controller_player.c:485-498`); the opponent controller uses the move table's `MOVE_TARGET_SELECTED`
  (`battle_moves.h:2273`; `battle_controller_opponent.c:1581`, `:1603` aim only `MOVE_TARGET_USER` moves at the user). So the user must turn
  Ghost between selection and move. The only way in the pools is Color Change (`battle_util.c:2752`; Skill Swap / Role Play / Trace can carry it),
  and the only Color Change sets are Kecleon 220 (challenge 1) and 325 (challenge 2), while every non-Ghost Curse set is 458 or higher
  (challenge 3 and up, `sets.py "'CURSE' in m.moves"`); Conversion and Transform are Metronome-only and the Curse users do not carry Metronome.

**Luck hunt day 1 (luck2, 2026-11-17): 59 of the 110 covered (53 before), 45 left (the six class (a) / (b) rules not counted).** The first day of the luck hunt
(`tools/replay-hunt/luckHunt.sh`, evidence `.integration/evidence/luck-hunt/20261117/`: 5000 lab seeds 1,020,000 up, 6 marker hits, ROM match 6, differ 0) found a
battle for six rules. Each stage file is promoted to `stages/coverage/` (so the nightly replay guards it) and was re-driven once from a worktree on the Scene OFF
oracle (`romReplayWide.sh --stage`, `match True`, `stage.ok True`) and once through `prehunt.py` with its own seed, which showed the `cover` piece run:
**R032** Rage after a Metronome miss (`R032-metronome-rage-miss`, seed 1020122, 20 of 20 states), **R037** (Cloyster Dive in a sandstorm, seed 1020059, 24 of 24),
**R038** (Foresight against a Ghost user, seed 1020099, 14 of 14), **R097** (Trick with both Pokemon itemless, seed 1023669, 20 of 20), **R107** (Baton Pass onto
AI Spikes, seed 1020548, 38 of 38), **R109** (Curse by the last Pokemon, seed 1022589, 19 of 19). The hunter now skips a design whose rule has a stage file here, so
the next day's seeds go to the rules still open (after luck3: R035 R040 R080 R110; after luck4: R035 R040 R110). Why the eight had no marker hit in about 538 seeds each (from `logs/<design>.log`, and one engine-only
seed of each design re-run in luck2; "flawed" = the marker cannot or hardly can run in that set-up, "rare" = it can, the odds are small):

- **R030 (AI replacement scored with Curse as the last move): fixed in luck3, see "Luck hunt day 2" below.** (Day 1: 0 of 539; the Toxic route cannot hit at all.)
- **R035, R040 (Counter / Mirror Coat scored up under Taunt): rare, as the design says.** Clefable has to call Taunt out of Metronome (about 1 in 340) and Snorlax
  has to knock it out the same turn; a battle holds only a few Metronome calls (3 in the first 3 turns of the seed re-run), so about 2000 calls over 538 seeds give
  a handful of Taunts and well under one with the timing. Both stay open; they need roughly ten times the seeds.
- **R039 (AI Memento against a target at minimum Sp. Atk) (day-1 reading; retired in luck3, see Luck hunt day 2): flawed set-up.** Arcanine's Overheat does about 126 of Weezing's 172 HP, so Weezing is dead after the second
  or third hit (seed re-run: 172, 172, 46, dead) while the −6 needs four uses even with the White Herb. Only misses and low rolls let it live. Needs a bulkier target
  or a weaker Overheat user.
- **R067 (Skill Swap Truant, Focus Punch set-up pre-pass) (day-1 reading; retired in luck3, see Luck hunt day 2): flawed set-up.** Slaking 659 has Shadow Ball and Aerial Ace, which do hurt Gengar: in the seed re-run Gengar
  is knocked out on turn 0, and 317 of 538 seeds end after 5 decisions. The design's premise ("cannot hurt Gengar") holds only for Earthquake and Brick Break. Needs a
  foe that cannot touch Gengar, or a Gengar that survives the first Shadow Ball.
- **R080 (Marvel Scale in the stored Future Sight damage): reachable but nearly so.** Milotic needs to be paralysed by Spark before Whiscash uses Future Sight; the AI used
  Future Sight on turn 0 in the seed re-run and Milotic dies within 5 turns, so the window is one or two turns. Rare, not shown impossible.
- **R095 (Trace waiting with no foe) (day-1 reading; retired in luck3, see Luck hunt day 2): flawed set-up, cannot run as built.** Spikes land on the side of the Pokemon that switches in, and the AI's Skarmory lays them on
  the player's side; for the foe to faint on entry the Spikes must be on the AI's side, and none of the player sets in the design (532, 556, 529) has Spikes. Needs a
  player Spikes user (Skarmory 482 as the lead) beside the Trace holder.
- **R110 (Roar drags a wounded Pokemon onto Spikes and it faints): reachable, rare.** Battles run 60 to 70 decisions and the AI does Spikes and Roar in them, but the
  dragged-in Pokemon must be below 1/8 of its HP; a random player rarely arrives there. More seeds, or a scripted player that keeps one Pokemon low.

**Luck hunt day 2 (luck3, 2026-11-17): 60 of the 110 covered (59 before), 44 left.** The four designs with a marker that never ran were rebuilt or retired. Every number
below is engine-only `prehunt.py` on 40 fresh lab seeds, 900000-900039, a block the day job (1,020,000 up) never uses; "before" is the day-1 log (0 of about 538 each).

- **R030: hit rate 0/539 -> 2/40 (900002 and 900020), both driven on the ROM to a full match; promoted as `stages/coverage/R030-skarmory-toxic-curse-ai-replacement.json`
  (seed 900002, 12 of 12 states, `romReplayWide.sh --stage` on the Scene OFF oracle, `match True`, `stage.ok True`).** The day-1 premise was wrong, and no Toxic design can
  hit: `HandleAction_ActionFinished` clears `gCurrentMove` (`battle_util.c:~670-678`), and a faint from end-of-turn poison is handled after it (`battle_main.c:3968`), so
  the AI scores its replacement with `gCurrentMove = NONE`, never Curse (a Sceptile-lead Toxic variant ran as designed, Sceptile died of poison on turn 5, Dewgong came in,
  marker not run; the Fearow-lead variant 0/40). The marker needs a faint handled inside the Curse action (`HandleFaintedMonActions` at `battle_util.c:640`, before
  `ActionFinished`): the AI's Ghost-type Curse costs half the maximum HP and at or below half HP it faints itself, and Dusclops 666 (challenge 6, the only Ghost
  Curse set) is the only such AI. The design is now challenge 6: Skarmory 674 (Drill Peck once, then Steel Wing, resisted) against Dusclops 666 with Quagsire 676 and
  Kangaskhan 694 behind it (no Fire/Electric move, so no super-effective move against Skarmory and the replacement is scored by damage with Curse current, 0 damage,
  `damageCalc.ts` TYPE_MYSTERY). `AI_CV_Curse4` only scores Curse down above 80 percent HP, so Dusclops picks it among its four moves once Skarmory has taken it under half.
- **R039: retired, no practical design (0/40 on the best variant; no design found that can).** The marker is the AI scoring Memento against a target at -6 Atk / Sp. Atk,
  i.e. Weezing 501 must act four turns after the player's Overheat (White Herb undoes only the first drop, so four uses) while the target is still there. Measured, the
  weakest Overheater, Granbull 474 (Sp. Atk 60), still does about 80 of Weezing's 172 HP per use (172 -> 93 -> 44...), and Weezing's Sludge Bomb does about 60 a turn to
  Granbull's 210 HP: in 40 seeds Weezing or Granbull was down by turn 3 in every one, and the AI used Memento or Destiny Bond early in most. A bulky lead that Granbull
  can Overheat four times and then let Weezing come in behind it fails too (Ludicolo 688 as the lead: it uses Double Team and Leech Seed and heals, 0/40). Every other
  Overheater hits harder; no other set lowers a target's Atk or Sp. Atk to -6 (Superpower has 5 PP, Intimidate is -1 per entry, no AI set has Charm / Feather Dance).
- **R067: retired, no practical design (0/40 in three variants).** The Focus Punch pre-pass skip needs a Focus Punch user whose `truantCounter` is non-zero, which
  only a Skill Swap from a Truant holder gives, and the Skill Swapper must hold Truant first (Gengar 613 / Alakazam 596 are the only Skill Swap sets; neither has Focus
  Punch), so it is two chained swaps with a Slaking that has to leave the field in between. The AI never helps: its Skill Swap is scored -1 unless an encouraged ability is
  involved (`AI_CV_ChangeSelfAbility`, `battle_ai_scripts.s:2358`; Truant is not in the list), 0 of 40 seeds used it. Slaking 659 (day-1 design) kills Gengar with Shadow Ball
  on turn 0 in 40 of 40 seeds (Ghost is a physical type in this game); Slaking 755 (specials only) puts Gengar to sleep with Yawn on turn 0 in 18 of 40 and gave two Skill
  Swaps in 1 of 40, never the marker; the AI does pick Focus Punch (29 of 40) but never with the counter set.
- **R095: retired, not made to hit (0/40 in four variants).** The day-1 premise (foe faints on Spikes) is not needed and not what the marker is: it is
  `if (target < 0) continue;` in the Trace pass of `HandleFaintedMonActions` state 6 (`battleScriptFaintedActionsOrchestration.ts:~463`), reached when a Trace holder has Trace
  pending and no foe is alive, i.e. the player's mon and the AI's last Pokemon faint in the same pass and the Trace holder is the player's replacement (Explosion /
  Destiny Bond by the player's last mon, Porygon2 behind it). Built as Alakazam 725 (kills two AI Pokemon), Golem 690 (Explosion), Porygon2 436 (Trace) it did reach the
  two-faint turn but never with the AI's last Pokemon: the AI picks its own replacement (type matchup), the order of the AI Pokemon is not the design's, and the script
  cannot wait for the right turn (it is per turn, not per event). Not shown impossible; it needs a script step conditional on the foe's remaining Pokemon.

The hunter's `luck-designs` loses R039, R067 and R095; R030 stays (the hunter skips it, a stage file covers it). R035, R040, R080 and R110 were not touched in luck3 (the time
went to the four above).

## Luck hunt designs (luck4)

**luck4 (2026-11-18, tools / docs only): R080 raised from 0 to a hit and promoted (61 of the 110 covered); R035, R040, R110 measured, not raised.** Every number is engine-only
`prehunt.py` (`nice -n 15`) on fresh lab seeds 910000-910029 (a block the day job, 1,020,000 up, never uses; luck3 used 900000-900039). Evidence under `.integration/evidence/luck4/`
(ignored).

| design | before (seeds 910000-910029, unchanged design) | after |
|---|---|---|
| R080 | 0/30 (day 1: 0 of about 538) | **2 hits in the 5 seeds run: 910000 and 910023** (each run stops at its first ROM match: 910000-910000 and 910020-910023); both full ROM matches (16 of 16 and 13 of 13 states) |
| R110 | 0/30 | 0/28 for a 3-turn Surf-first prefix; no better design found |
| R035 | 0/30 | design not changed (see below) |
| R040 | not run (same turns as R035) | design not changed |

- **R080 (rebuilt, promoted).** Reading the engine runs showed why 0/538: Whiscash 483's AI is nearly deterministic against Milotic 559, Future Sight on turn 0, Earthquake on turns 1 and 2,
  Future Sight on turn 3 (20 of 20 seeds); Spark appears only at turn 4 or later, when Milotic is nearly dead, and Milotic was paralysed in 0 of 20 seeds (Surf as the player move, or Mirror Coat all
  14 turns, lengthened the battle from 9-15 to 14-46 decisions and changed nothing). The marker needs the status to exist at the moment the stored damage is computed, i.e. when Future Sight is
  cast. New design: the opponent leads with Ampharos 518 (Thunder Wave, Bright Powder) then Whiscash 483, then Arcanine 560; the player is Milotic 559, Snorlax 556, Steelix 529 with Ice Beam every
  turn. In 10 of 10 seeds Ampharos used Thunder Wave on turn 0 and Milotic was paralysed from turn 1; Ice Beam knocks Ampharos out, Whiscash comes in and casts Future Sight on its first
  turn (a paralysed Milotic is also slower, so Whiscash casts first). Promoted as `stages/coverage/R080-spark-whiscash-future-sight-milotic.json` (seed 910000, 16 of 16 states,
  `romReplayWide.sh --stage` on the Scene OFF oracle from the repo file: `match True`, `stage.ok True`); with the promotion the hunter skips R080 (open: R035 R040 R110). Why not the player's own
  status route: no player set has both a status move and Future Sight (`sets.py "'FUTURE_SIGHT' in m.moves"`: Kirlia 48 and Barboach 55 are in no challenge).
- **R035 / R040 (Taunt via Clefable's Metronome): measured as already near its ceiling, not changed.** The marker needs a Taunt called on the turn Clefable faints: the timer is 2 and drops by one
  at every turn end (`battle_script_commands.c:9160`, `battle_util.c:1749`), so a Taunt cast on turn t is still there when the replacement is scored at the start of t+1, and gone at t+2. So
  only the final turn of each Metronome user counts, once per Clefable: chance = (P the AI picks Metronome that turn, about 0.3-0.5) x (about 1/340) = roughly 0.1 percent a seed, whatever the
  player does (a longer battle adds Metronome calls that cannot count; a faster player skips Clefable's move). Only one Metronome user can be on the AI team at challenge 7 (Chansey 227 is
  challenge 1 only). The design already has the player slower than Clefable and Clefable down in two Hyper Beams (seed 910000: Clefable 170 -> 76 -> dead on turn 3), so there is nothing to raise:
  0/30 is the expected result, and the hunter's day (about 500 seeds a design) gives one hit in two days or so. Left open, not retired. A single battle cannot serve both rules (one replacement).
- **R110 (Roar drags a wounded Pokemon onto Spikes): not raised.** The marker needs the AI Skarmory to lay Spikes, Roar, and the dragged-in bench Pokemon to be under 1/8 (one layer) to 1/4 (three
  layers) of its HP, so the bench must be wounded and still alive. A fixed three-turn Surf-first script and a random player gave 0/28 (battles 16-78 decisions). Candidates not tried for lack of
  time: a bench of mons that Spikes entries plus Drill Peck chip (a switch-heavy script needs a `switch` step that survives fainted slots, which the script format cannot express), or a Substitute /
  Belly Drum step to put a bench mon low. Not shown impossible.

Left in (c), with the reason (none is proven unreachable):

- **R103** (cure berry at the end of the turn on a Pursuit user): the only skipped move-end step is Pursuit on a switching foe
  (`battle_scripts_1.s:3143`), and `HandleFaintedMonActions` state 6 gives the player's battler 0 an `ItemBattleEffects` pass after every action
  (`battle_util.c:1958-1962`). No Pursuit set holds a cure berry, no set has both Trick and Pursuit, so the berry would have to arrive on a
  Pursuit user by a Trick chain across both teams and the AI would have to Pursuit the right switch. Not stageable cheaply.
- **R083** (Own Tempo after a Thrash lock): no Thrash / Petal Dance / Outrage set has Skill Swap, Role Play or Trace, and no Own Tempo set has
  Skill Swap, so Own Tempo would have to be swapped in by Alakazam 596 / Gengar 613 (Skill Swap with an Own Tempo foe, then again with the
  thrasher; Choice Band locks the first Skill Swap, a Trick has to precede it) and the AI would have to pick Thrash. About ten scripted turns of
  AI luck; not stageable cheaply.
- **R073** (Hidden Power type index past ???): the only Hidden Power set is Unown 126, and the lab refuses it (`oracle/battle_lab.py`:
  "player set 126 is Unown, which Factory forbids"); so again Metronome only.
- **R099** (Uproar keeps a Yawn drowsy), **R090**, **R104**: the only Uproar set in range is Vigoroth 221 (challenge 1). Vital Spirit makes it
  immune to Yawn, the Yawn user (Wartortle 176) has no Uproar, the Soundproof sets are in challenge 0 (Voltorb 115) or 3 and up, and no Effect
  Spore set (Parasect 177 / 282, Breloom 382 and up) has Uproar. Only a Metronome Uproar reaches them.
- **R094, R098, R100, R101** (Thick Club / Metal Coat in Future Sight, Doom Desire, Weather Ball): no set has Doom Desire or Weather Ball, and
  a Thick Club on a Future Sight user needs a Trick chain; Metronome.
- The rest (R049-R053, R055-R064, R071, R072, R075, R078, R079, R082, R085, R086, R091, R096, and R068, R081, R106 as read in luck1) need an AI or
  a player Metronome (Chansey 227, Clefable 389) to draw a particular move: a seed lottery, not a set-up.

See `STATUS.md`, "Box hunt 2026-11-16 (rrh4)".

How the classes were made: the patterns above, then a reading of every other piece against the C source by eleven
reading passes, each with the same brief (class (a) or (b) only with a reason that can be pointed to, else (c)). Every
entry of the classes file names its reason. It is a reading of the source, not a test: a wrong (a) or (b) would hide
a rule, so the brief asked for (c) whenever the reason was not certain. Samples were checked by hand (for example: no
pool species has Drizzle, Sand Stream or Drought; the jump-command entries cite the script lines).

## What the list has given so far

- **Fix 41** (`ai-foresight-ghost-second-roll.md`): reading a never-run AI branch against the game's script showed that
  the engine made one random roll where the game makes two. ROM proof by a staged battle.
- **The two leads, checked on the ROM (sixth pass):**
  - Pursuit on a switching Pokemon when the Pursuit user has Synchronize: **a real difference, fix 43**
    (`pursuit-synchronize-moveend.md`). The game ends the move-end steps after Synchronize; the engine ran the rest and
    then stopped with an error in the switch. Mechanic Lab ROM run and a test with the same numbers.
  - Follow Me and a Ghost Curse aimed at its own user: **cannot happen in a singles battle** as stated. With the foe's
    Follow Me up, the game aims the Curse at the Follow Me user when the move starts (`HandleAction_UseMove`,
    `battle_util.c:148-156`), so `BattleScript_GhostCurse` never reaches `getmovetarget`. Checking it found a related
    real difference: the engine lacked that start-of-move redirect, which changes the PP a non-Ghost Curse costs
    against a Pressure Follow Me user: **fix 42** (`follow-me-redirect.md`).
- **Not done yet:** a staged battle or a steered batch for each (c) group, starting with the uncommon ones.

**Luck hunt day 3 (2026-11-18 day job): 62 of the 110 covered (61 before).** 5,681 seeds over the three open designs (R035 294, R040 2,694, R110 2,693;
the hunter skipped the 8 covered ones), 1 marker hit: R035 at lab seed 1040873 (Clefable's Metronome called Taunt, then the AI's Machamp scored Counter
under Taunt), ROM match 14 of 14 states with its `cover` piece run. Promoted to `stages/coverage/R035-clefable-taunt-counter-replacement.json`; the
hunter now skips R035. Open luck designs: R040, R110 (0 hits each in ~2,700 seeds). Summary: `.integration/evidence/luck-hunt/20261118/summary.md`.

**luck5 (2026-11-18, tools / docs / designs only): 63 of the 110 covered (62 before), R094 and R098 moved to class (a).** Seven Metronome designs added to
`tools/replay-hunt/luck-designs/`, one per rule, all in one battle shape: challenge 7, the player's Clefable 389 (IVs 31) calls Metronome ten times
(`prefer` slot 0, 10 PP) opposite Shuckle 528 (Attack 10, cannot knock it out; speed 5 against 60), then `preferSwitch` to Snorlax 826 so the battle ends inside
the ROM drive's state budget. Each design names its marker as a `cover` piece (from `rule-coverage-c-rules.json`) and passes `designcheck.py`. Because the seven
share the battle, one trial of a union-cover design (all their markers as `coverAny`) measures all of them at once; the hunter still runs one design per rule.
Measured: about 6 Metronome calls per battle reach a real move, 86 in the 14 battles that ran to the end of the last trial (the rest are calls that end without a move; `PREHUNT_CALLS=1`, new in `prehunt.py`: prints each seed's Metronome calls and what they became).

| rule | marker (engine) | chance per seed (estimate) | trial (engine only, JOBS 1) |
|---|---|---|---|
| R073 Hidden Power type past ??? | Hidden Power with odd IVs (Clefable ch 7, IVs 31 = Dark) | 0.03 (any of ~10 calls: 10/336) | **hit at lab seed 920103, promoted** (below) |
| R101 Weather Ball in sandstorm | Weather Ball while Shuckle's Sandstorm is up | 0.02 | 0 hits |
| R082 Mud Sport twice | Mud Sport or Water Sport called twice | 0.0008 | 0 hits |
| R078 Lock-On then OHKO move | Lock-On / Mind Reader, then Fissure / Guillotine / Horn Drill / Sheer Cold | 0.0006 | 0 hits |
| R079 Lock-On then a no-accuracy move | Lock-On / Mind Reader, then a move with no accuracy roll (Roar, Yawn, Skill Swap, ...) | 0.002 | 0 hits |
| R096 Transform fails on a digging target | Transform while Shuckle is in Dig | 0.004 | 0 hits |
| R058 Charge, then an Electric move | Charge then an Electric move | 0.0014 | 0 hits |

Trial seeds: 920000-920007 (8), 920100-920103 (4, stopped at the hit), 920200-920216 (17; 14 ran to the end and 3 hit the frame budget, then `STALL-ABORT`).
29 battles in all, JOBS 1. One marker hit, the R073 one, on the first design family's union trial. The expected hits for the others at 29 battles
are 0.58 (R101), 0.02 to 0.12 for the rest, so the zeros say nothing against them; the hunter's days will (R101 needs about 50 seeds for even odds, the rest
hundreds to thousands). A stall (Shuckle's Double Team / Dig loop; 3 of 17 in the last trial) shortens a seed; the hunter ends it after the frame budget and
disables a design only after 6 failures in a row.

- **R073 promoted: 62 -> 63 of 110.** Seed 920103: one Metronome call was Hidden Power; Clefable's IVs 31 are odd, so the type index is 15 (Dark), past the `???` index the
  marker skips. Stage file `docs/parity-mac/stages/coverage/R073-clefable-metronome-hidden-power-odd-iv.json`; driven again from the repo file on the Scene OFF oracle:
  match 31 of 31 states, 29 of 29 wide states, 0 diff points, `stage.ok` true. The hunter now skips R073. **No ROM difference was found in luck5.**
- **R094: class (a), cannot occur.** The Thick Club arm of the Future Sight / Doom Desire damage (`battleScriptTrysetfutureattackOpcode.ts:88`; Thick Club on a
  Cubone / Marowak) needs a Cubone or Marowak that casts Future Sight or Doom Desire. No Cubone / Marowak set has either, none has Metronome, and the only way to
  give one a move or item (Trick, Covet, Thief) is forbidden to Metronome and absent from the sets that would hold the item.
- **R098: class (a), cannot occur.** The Steel arm (`battleScriptTrysetfutureattackOpcode.ts:80`; a Metal Coat holder casting Doom Desire) needs Doom Desire on a Metal
  Coat holder. No set has Doom Desire; the only Metal Coat holder is Lairon 215 (no Metronome), and Trick / Covet / Thief cannot be called by Metronome.
- **Skipped as too low-odds for a design** (two or more specific Metronome calls in one battle, under about 1e-4 per seed): R049, R055, R061, R062, R071, R072,
  R075, R086, R104. R103, R083, R106 and R081 were not touched (not Metronome-reachable cheaply, see their entries above).
- **Not written in this step (out of time):** the AI-Clefable family R050-R053 (needs a passive bulky player with a repeatable heal and a move shared with
  Clefable), the Chansey challenge-1 family R063 / R064 / R068 / R091 / R099 and R100. They stay in (c).

**luck6 (2026-11-18, tools / docs / designs only; no `src/` change): 66 of the 110 covered (63 before), R051 R052 R053 promoted.** Nine designs added to `tools/replay-hunt/luck-designs/`
(written by `tools/replay-hunt/makeLuck6.py`, each passing `designcheck.py`), covering the luck5 leftovers R050-R053, R063, R064, R091, R099 and R100. Two battle shapes:
(1) challenge 7, **the AI's Clefable 389** (Metronome, Double Team, Reflect, Follow Me) against a player that cannot hurt it and plays one move 16 turns, then Salamence 753 plays Aerial Ace
(never misses, so no Double Team stack can stall the end): Shuckle 528 (Flash) for R050 / R051 / R052 / R053 (one battle, four markers: Imprison, Mist, Mud Sport, Focus Energy called by the AI's Metronome
and the flag still up when the AI next scores), Golduck 418 (Light Screen, Cloud Nine) for R100 (Weather Ball under Cloud Nine; no weather needed, `weatherHasEffect` is false); an AI Metronome user needs no survival
tricks because the AI picks Metronome itself, about 7 calls a battle (30 battles: 212 calls, 126 reaching a move). (2) Challenge 1, **the player's Chansey 227** calls Metronome 14 turns (script) against a foe whose move
the marker needs: Banette 237 Spite after a called Transform (R091), Minun 187 Encore (R064: Encore locks the Metronome slot because Metronome is the last move used, `battle_script_commands.c:4407`, so a called Transform
replaces the encored slot), Wigglytuff 207 Disable (R063: one Defense Curl first, so Disable takes a slot Transform can replace), Wartortle 176 Yawn with a called Uproar (R099).

| rule | marker | chance per seed (estimate) | engine-only trial (JOBS 1) |
|---|---|---|---|
| R052 Mud Sport flag | AI called Mud Sport (`mudSportUp` arm of the AI scoring) | 0.03 (~7 calls / 336) | **hit at lab seed 930003 (4th seed), promoted** |
| R051 Mist flag | AI called Mist, still up at the next scoring | 0.02 | **hit at 936007 (8th seed), promoted** |
| R053 Focus Energy flag | AI called Focus Energy | 0.03 | **hit at 937010 (11th seed), promoted** |
| R050 Imprison flag | AI called Imprison (status set even with no shared move) | 0.03 | 0 hits in about 55 battles that carried its marker (930000-930005, 931000-931013, 936000-936007, 937000-937010, 938000-~938015); expected ~1.6, p(0) about 0.2, kept as a design |
| R100 Weather Ball, Cloud Nine | AI called Weather Ball with Golduck on the field | 0.02 | 0 hits in 30 seeds (940000-940029; 212 calls, expected 0.6) |
| R091 Spite on a transformed user | Transform, then Spite on a copied move | 0.02 | 0 hits in about 30 seeds (933000-933013, 935000-~935015) |
| R064 Transform ends Encore | Encore on the Metronome slot, then a called Transform | 0.01 | 0 hits in 14 seeds (934000-934013) |
| R063 Transform ends Disable | Disable on Defense Curl, then a called Transform | 0.003 | 0 hits in 14 seeds (same block); one seed (934006) called Transform with no Disable up |
| R099 Uproar keeps a Yawn drowsy | Yawn due while a called Uproar runs | 0.003 | 0 hits in up to 16 seeds (935000-935015) |

The R050 / R051 / R053 zero-or-late hits fit the estimate (3 hits in about 35 battles for R051-R053); R091, R064, R063, R099 and R100 are too short to say more than that the marker is reachable in the design (each design's engine battle ran to the end; one stall in 14 for
R064 / R063: 112 and 239 decisions, and 1 in 14 for the AI-Clefable shape, seed 931008). Expected hits per day (about 5,700 seeds over about 17 open designs, ~330 each): R050 / R100 ~6-10, R091 ~6, R064 ~3, R063 / R099 ~1.
- **Promotions: 63 -> 66 of 110** (R052 seed 930003: ROM match 55 of 55 states, R051 seed 936007: 35 of 35, R053 seed 937010: 42 of 42, each re-driven from the repo stage file on the Scene OFF oracle, `stage.ok` true, 0 diff points). **No ROM difference was found in luck6.** The hunter skips R051 R052 R053 from the next seed on.
- **The Double Team stall is fixed (cheaply):** every Clefable design now ends with Salamence 753 (Aerial Ace, slot 2) instead of Snorlax 826 (luck5's seven designs patched the same way): 0 stalls in the 17 seeds where luck5 saw 3.
- **Not done (and why):** R049 R055 R061 R062 R071 R072 R075 R086 R104 stay skipped (two or more specific calls per battle); R068 (frozen Flame Wheel; needs the foe to freeze a Growlithe / Quilava, an Ice move the AI avoids against Fire),
  R081, R106, R103 and R083 are as before. Candidates for a later luck step on the same AI-Clefable shape: R085 (Imprison against a Pressure player: a Pressure Pokemon as the passive player), R056 / R057 (Beat Up by Metronome, chance ~3% each with a statused / fragile player).

