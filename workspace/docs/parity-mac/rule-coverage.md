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

**Box hunt rrh2 (2026-11-14): 47 of the 110 covered, four now class (b), 59 left.** Ten more rules have a staged battle in
`stages/coverage/` that ran the piece and matched the ROM to the end: R054, R060, R066, R070, R074, R084, R087 (with R089), R088,
R089, R092. Three of the designers' "cannot occur" notes were checked against the decomp and move to class (b):

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

**R035 and R040 (AI Counter / Mirror Coat scored up under Taunt) stay class (c)**: `AI_CV_Counter` (`battle_ai_scripts.s:1618-1637`) uses
`if_target_not_taunted`, so the branch is reachable. But no set from id 267 up has Taunt and only an AI Metronome user (Clefable 389,
Chansey 227) can call it, about 0.1% of lab seeds, and a Mechanic Lab stage is ROM-only (`romReplayWide --stage` cannot drive it). Not stageable
cheaply; left uncovered. See `STATUS.md`, "Box hunt 2026-11-14 (rrh2)".

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
