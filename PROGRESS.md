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

---

## 675 — [BOUNDED MAIN WORKER 2026-07-29 ~01:53] multi-candidate trainer replacement retired; seed 17 wins seven

- **State:** committed `30d9a3e5`; tree green at **461 files / 4960 tests**,
  production build, `git diff --check`, focused selector/opcode/orchestrator/
  ratchet coverage **25/25**, and Battle Scene OFF oracle info. The ability/
  item census regenerates byte-identically at **69/69 abilities, 42/42 hold
  effects**.
- **Did:** verified the scout's `GetMostSuitableMonToSwitchInto` citations
  against pinned `battle_ai_switch_items.c:629-789` and ported the complete
  Factory-singles faint selector. Pass 1 retains ascending scans, strict ties,
  and the source's highest-type-damage quirk. Pass 2 retains global
  `gCurrentMove`/fainted-active `AI_CalcDmg`, candidate-only `TypeCalc`,
  Levitate/Foresight behavior, reset dynamic/crit/damage scratch,
  Charge/Helping Hand modifiers, and the retail non-`BUGFIX` u8 `bestDmg`
  wrap. Singles selection draws exactly **0 RNG**.
- **Acceptance:** staged tests pin a competitive choice, exact tie, u8-wrap
  reversal, and sole-legal regression. Seed **17** is now a permanent real
  rung-12 carrier: seven generated wins, **14** trainer replacements, seven
  battle segments, and one exact **1787-call** facility cursor; its first
  replacement resumes at the next player boundary with
  **2→16 calls / 312997333→713294723**.
- **Sweep / Next:** seeds **4–30** now pass battle 0/1/2 at **14/9/7**;
  **1/27** (seed 17) completes seven wins. Every former multi-choice
  replacement stop is gone. Updated dominant blocker is multi-hit/Double Hit/
  Twineedle resumption (**6** seeds), then Earthquake
  `DoHitAllWithUndergroundBonus` (**5**), confusion self-hit context (**4**),
  forced-switch end-turn resumption and paralysis `Cmd_various` (**3** each);
  five seeds expose narrower existing budget/moveend/Trace/attack-canceler
  stops. Chase those named secondary blockers only in later steps.
- **Supervisor fold (same round, side merge):** the commentary seam landed
  (`8ec1cd81` + the equivalence/attribution pins) — presentation commentary
  now derives from the actual opponent party via
  `getFactoryOpponentCommentary()`; canonical text proven byte-identical
  (with the true upcoming-party attribution 188/184/135 pinned, correcting
  the earlier 153/179/181 placeholder attribution); generated seed-3 round
  varies correctly; `battle1-postwin-scout-a/b.json` re-verified 171/171 +
  164/164. Union green **461 files / 4961 tests**, census no-op.
- **Notes:** retired exact barrier
  `GetMostSuitableMonToSwitchInto's pass-2 AI_CalcDmg raw-damage fallback`
  at `B_SCR_OP_OPENPARTYSCREEN`; its module ratchet moves exactly **2→1**.
  No other ratchet, census artifact, canonical recording, issue, scout/probe,
  presentation, or commentary file changed. PAPERCUT: none.

---

## 674 — [BOUNDED MAIN WORKER 2026-07-29 ~01:35] tie retired; seven-battle rung hit honest stop

- **State:** assigned rung (a) is committed at `bd36b615` and green at **461
  files / 4956 tests**, production build, `git diff --check`, and focused
  lifecycle/orchestrator/ratchet coverage **14/14**. Rung (b) hit its
  mandated honest stop: seeds **4–30** with generated parties produced no
  seven-win carrier; only 22/23 passed battle 0, then halted in battles 1/2.
  The red exploratory test was removed; the landed tree remains green.
- **Did:** consumed scout §4.1's landed Scene-OFF receipt. Equal effective
  speeds now add exactly one `Random()` strictly after draw A and before draw
  B; `tie & 1` stable-orders `[0,1]` or `[1,0]`, and the post-tie cursor feeds
  every entry hook before B overwrites `randomTurnNumber`. The Tier-1 receipt
  pin reproduces **62606 → 997 → 8088**, exactly **3 calls**, `997 & 1 = 1`,
  and observes resulting hook order **[1,0]**.
- **Supervisor fold (same round, side merge):** the rung-13 scout landed
  (`f9788112`) — `docs/factory-ai-switch-scout.md`, a 557-line frozen
  dossier: complete `ShouldSwitch` + `GetMostSuitableMonToSwitchInto`
  derivation (incl. source quirks), Factory L50 reachability per helper,
  draw ordering vs the 11/13-draw ledgers, masks 0/1/7 by streak, exact
  kernel changes for trainer-originated switches, 3 staged OFF recipes
  (predictions, not receipts), and 4 bounded implementation rungs. The
  sweep's dominant blocker (multi-choice trainer faint replacement) is the
  same mechanism — the dossier's scoring section unblocks it.
- **Next:** implement multi-candidate trainer faint replacement from the
  dossier's `GetMostSuitableMonToSwitchInto` derivation (main), wire
  generated commentary into its identified presentation seam (side); then
  the remaining sweep blockers (`Cmd_various` paralysis, confusion
  self-hit context, multi-hit/Twineedle resumption, Earthquake
  `DoHitAllWithUndergroundBonus`, player forced-switch end-turn
  resumption) and the rung-12 rerun.
- **Notes:** `factoryBattleStart.ts`'s last `unsupported-branch` and union
  return path are gone; its module ratchet moves exactly **1→0**. No census
  artifact, canonical recording, issue, scout/probe/battle-lab,
  commentary/presentation, or AI-switch-breadth file changed. Sweep evidence:
  seed 4 battle 1 sets **199/178/148** hit paralysis `Cmd_various`; seed 5
  battle 0 **163/161/189** hit Earthquake controller handling; seed 6 battle
  1 **181/199/127** and most seeds 8–21/26–29 hit multi-choice trainer
  replacement; seed 22 battle 1 **144/173/192** hit confusion self-damage;
  seed 23 battle 2 **141/185/114** hit Earthquake; seed 7 hit Twineedle and
  seed 25 multi-hit. This satisfies the rung row's STOP-and-report clause,
  not its seven-win acceptance. PAPERCUT: none.
