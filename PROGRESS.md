# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
> **STANDING ARRANGEMENT (user directive, 2026-07-26):** the animation
> program runs under its own supervisor (`./run-supervisor.sh --lane
> animation`, guide `ANIMATION_SUPERVISOR.md`) in the persistent
> `.worktrees/animation-main` worktree on branch `animation-main`. Main
> supervisor: never brief animation work; fold `animation-main` into
> `master` at orient when it has new commits (details in SUPERVISOR.md's
> parallel-workers note). This replaces the temporary animation pause —
> entry 468's animation items are the animation supervisor's backlog now.

## 678 — [BOUNDED MAIN WORKER 2026-07-29 ~02:56] confusion self-hit resumes; 17 seeds win seven

- **State:** committed `2c1cd213` and `9a1611ba`; tree green at **486 files /
  5033 tests**, production build, `git diff --check`, focused
  confusion/orchestrator/ratchet/census coverage **34/34**, and Battle Scene
  OFF oracle info. The original six carriers remain exact:
  **4/6/8/13/17/26 = 1517/1563/2089/2224/1787/1556** calls.
- **Diagnosis / source fix:** seed 22 halted in battle 2 at facility call
  **430**, player HP **144**, confusion counter **2**: the canceler threw
  because generated battlers lacked the staged duplicate `confusionDamage`
  object despite already carrying every live `gBattleMons` operand. The
  reducer now falls back to those live level/Attack/Defense/stage/burn/Guts
  fields, matching `battle_util.c:2157-2177`'s sole `Random() & 1`, self
  target, `CalculateBaseDamage(attacker, attacker, MOVE_POUND, 0, 40, 0,
  attacker, attacker)`, self-damage marker, and unable hitmarker.
- **Script / RNG acceptance:** the newly exposed honest stop was
  `BattleScript_DoSelfConfusionDmg`'s first opcode, `various BS_ATTACKER,
  VARIOUS_CANCEL_MULTI_TURN_MOVES`; case 0 now delegates to the existing
  exact cancellation helper per `battle_script_commands.c:6327-6329` and
  `battle_util.c:877-888`, then completes the literal
  `battle_scripts_1.s:3796-3815` script. Full-turn tests pin survival, self-KO
  into player replacement, and no-self-hit; self-hit draws are exactly
  canceler position 0 then `adjustnormaldamage2` position 1, with no ordinary
  accuracy/crit/hit-chain rolls, and the end-turn cursor remains continuous.
- **Sweep / Next:** seeds **4-30** now pass battles 0/1/2 at **23/21/20**;
  **17/27** complete seven wins. New exact carriers are
  **5/7/11/14/15/16/19/22/24/29/30 =
  1688/1827/1970/2325/2036/1660/1842/1377/1690/1543/1558** calls and are
  pinned alongside the originals. Dominant blocker is now forced-switch
  end-turn resumption (**4** seeds), then move-end barriers (**3**), then one
  each wake-up `Cmd_bicword`, end-turn budget, and attack-canceler stop.
- **Supervisor fold (same round, side merge):** the trainer-identity seam
  landed (`cb57045d` + `1c78886d`, `factoryTrainerPresentation.ts`) —
  pre-battle trainer name/class/speech presentation now derives from the
  round's generated trainer record, with the canonical trainer proven
  byte-identical first and 12 committed traces re-verified at their
  recorded counts (incl. the permanently-parked 255/256 and 224/228).
  Union green **487 files / 5037 tests**, census no-op.
- **Notes:** retired named barrier `Cmd_various:
  VARIOUS_CANCEL_MULTI_TURN_MOVES`; no unsupported-branch/import ratchet
  moved because the generic `Cmd_various` barrier remains for other cases.
  Executable and ability/item censuses regenerate byte-identically. No issue,
  probe, presentation, animation, canonical recording, or tick branch
  changed. PAPERCUT: none.

---

## 677 — [BOUNDED MAIN WORKER 2026-07-29 ~02:37] interaction audit: double faint + deferred entry hooks + AI reveals

- **Supervisor fold (post-step, `d057f085`):** `animation-main` folded at
  02:40 with 21 overnight commits — Moonlight/Perish Song/Howl/Rest/Wish/
  Sandstorm/Needle Arm/Follow Me/Metronome promoted exact with coverage
  ratchets. Union green **485 files / 5019 tests**, production build. The
  ledger's "For the main program" asks are historical (stat-drop seam
  already fulfilled via Fake Tears). Also filed **ISSUES #48**
  (cross-challenge rentsCount persistence, the audit's PLAUSIBLE finding).
- **State:** committed `91857570`, `234b5405`, and `9c0eca68`; tree green at
  **461 files / 4975 tests** pre-fold (**485/5019 post-fold**), production
  build, `git diff --check`, and Battle Scene OFF oracle info. All six
  seven-win carriers retain exact facility cursors: seeds
  **4/6/8/13/17/26 = 1517/1563/2089/2224/1787/1556**.
- **Did:** fainted-actions resume now carries the source's ascending battler
  cursor past a player replacement, so simultaneous contact-ability
  double-faints resolve the opponent replacement before leaving the pass
  (or source `checkteamslost` terminates immediately when the opponent has no
  surviving party HP). Mid-battle `Cmd_switchineffects` now only marks
  Intimidate/Trace pending; faint state 6 resolves Intimidate → Trace → item,
  including White Herb stage restoration/consumption. Voluntary and forced
  switch callers share the same pass; battle-start's already-correct split
  stays green.
- **AI / acceptance:** successful Static (failed proc excluded), state-6
  Intimidate/Trace, and Leftovers now publish source reveal handoffs; the live
  Factory AI consumes them through the existing record functions and projects
  both `knownAbility` and `knownItemEffect`. Focused coverage is **79/79**;
  executable and ability/item censuses regenerate byte-identically; no import
  or unsupported-branch ratchet moved.
- **Next / bounded remainder:** finish the still-unwired source reveal calls:
  `battle_util.c:216,3859`, the other successful `:3195` ability branches,
  and `battle_script_commands.c:990,1382,1418,1441,1496,1679,1722,2304,2346,
  2401,2431,2553,2774,2874,3118,3133,3148,4512,4587,5880,6229,6572,6842,
  7003,7018,7031,7509,7518,7680,8394,8410,9233`. These opcode-owned
  absorption/prevention/item sites need their own semantic pins; do not infer
  them from `lastUsedAbility/Item`. No issue, probe, presentation, animation,
  canonical recording, or tick branch changed. PAPERCUT: none.

---

## 676 — [BOUNDED MAIN WORKER 2026-07-29 ~02:15] multi-hit/Earthquake resumptions retired; six seeds win seven

- **State:** committed `a04a26c1`, `c104d8f8`, `bc2a65a0`, `027e5aa0`,
  and `59ab42f2`; tree green at **461 files / 4971 tests**, production build,
  `git diff --check`, and Battle Scene OFF oracle info. Executable
  (**214/214 effects, 355/355 moves**) and ability/item (**69/69 abilities,
  42/42 hold effects**) censuses regenerate byte-identically.
- **Did:** the full-turn adapter now resolves only literal decimal u8/u16
  operands in addition to its named wait constants, so
  `setmultihitcounter 0/2` and `waitmessage 1` resume instead of being
  mistaken for unavailable external context. Its 256-opcode runaway guard
  now counts source-instruction completion separately from bounded
  controller/message yield steps; five-hit loops no longer spend the guard
  on acknowledgements or wait ticks.
- **Acceptance:** full-turn Spike Cannon pins three hits, its hit-count draw
  at position 2, and exact 14-call cursor continuity; the maximum five-hit
  reroll path, fixed two-hit Double Kick, and Twineedle all reach the next
  command with every target controller update. Earthquake reaches the same
  boundary with one hit sourced from
  `BattleScript_DoHitAllWithUndergroundBonus`; the existing shared-script
  fixture retains the underground 2× multiplier proof.
- **Sweep / Next:** seeds **4–30** now pass battle 0/1/2 at **19/15/13**;
  **6/27** complete seven wins: seeds **4/6/8/13/17/26**, permanently pinned
  at **1517/1563/2089/2224/1787/1556** facility calls. Seed 17 remains exactly
  **1787**. Dominant blocker is now confusion self-hit context (**9** seeds),
  then forced-switch end-turn resumption (**4**) and paralysis `Cmd_various`
  (**3**); move-end barriers (**2**) and one each Trace/end-turn-budget/
  attack-canceler stop are narrower follow-ups.
- **Notes:** no unsupported-branch/import ratchet moved, no census artifact
  changed, and no canonical recording, issue, probe, presentation, animation,
  or tick branch changed. Earthquake's doubles-only next-target barrier
  remains unchanged and unreachable in Factory singles. PAPERCUT: none.
