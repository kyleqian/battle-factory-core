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

## 672 — [BOUNDED MAIN WORKER 2026-07-29 ~00:57] production Factory AI turn driver landed

- **State:** Gate-5 plan rung 6 is green at **459 files / 4920 tests** plus
  production build, `git diff --check`, Battle Scene OFF oracle info, and
  focused live-AI/whole-battle/policy/ratchet coverage **25/25**. Executable
  (**214/214 effects, 355/355 moves**) and ability/item (**69/69 abilities,
  42/42 hold effects**) censuses regenerate byte-identically.
- **Did:** added the live rules→mask-7 view adapter (active stats/types/stages,
  status/screens/weather, generated ability names, current moves and Factory
  streak/opponent policy) plus persistent source-shaped used-move/known-
  ability/known-item history. A focused test exactly reproduces the banked
  Alakazam-vs-Marowak decision and **11-draw** ledger from both staged and
  live shapes. The fresh 3v3 loop now sends all **12 trainer commands**
  through `submitFactoryAiDecision`; every choice is live-request-legal and
  all policy/hit/boundary draws share the exact **188-call** cursor through a
  real player-win terminal. Commits `7d93cf8c`, `ad888ce7`.
- **Next:** rung 11: let the round controller own one real generated battle
  lifecycle through result/swap/next-battle. Rung 13 remains the explicit
  Factory AI switch/item/history breadth closure.
- **Notes:** source `ChooseMoveOrAction_Singles` move recording and switch/
  faint clears are modeled (`battle_ai_script_commands.c:396-403,618-660`;
  `battle_main.c:3259-3261,3352-3354`). Ability/item record APIs are durable;
  this carrier executes no player-target record site. Rung 6 uses a named
  `factory-ai-switch-precheck-unimplemented` constraint because source
  `AI_TrySwitchOrUseItem` calls `ShouldSwitch` first
  (`battle_ai_switch_items.c:528-545`); trainer items are source-unreachable
  in Frontier battles (`battle_ai_script_commands.c:292-306`). No barrier/
  ratchet, census artifact, round/controller, generation, doc, issue,
  presentation, or canonical-recording file changed. PAPERCUT: none.

---

## 671 — [BOUNDED MAIN WORKER 2026-07-29 ~00:33] fresh 3v3 whole battle reaches real terminal

- **State:** Gate-5 plan rung 4 is green at **457 files / 4915 tests** plus
  production build, `git diff --check`, Battle Scene OFF oracle info, and
  focused whole-battle/lifecycle/ratchet coverage **62/62**. Executable
  (**214/214 effects, 355/355 moves**) and ability/item (**69/69 abilities,
  42/42 hold effects**) censuses regenerate byte-identically.
- **Did:** `factoryWholeBattle.test.ts` builds two complete three-mon parties
  only from real corpus set ids, enters through the fresh initializer, and
  loops solely over published command/forced-switch requests through
  `submitBattleDecision`. Real moves faint all three opponents; Azurill's real
  faint publishes and resumes one player forced switch; Hyper Beam recharge
  and Ice Ball exercise two reducer-owned locked trainer turns; the terminal
  adapts to a real win. Every submission is request-legal and the entire
  battle pins one monotonic **32-call** LCG cursor from draws A/B through the
  terminal hit chain.
- **Supervisor fold (same round, side merge):** rung 10 landed (`af959d79`)
  — round swap mutation unified with the full rental record (identity copy
  `battle_factory_screen.c:2350-2360`, party reconstruction
  `battle_factory.c:433-464`, item restore `:714-728`, heal
  `script_pokemon_util.c:30-58`, PP-Up formula `pokemon.c:4650-4653`);
  accept/decline both feed the next kernel party exactly; between-battle
  full restore proven. Union green **458 files / 4918 tests**, census
  no-op.
- **Next:** rung 6 (production AI view/driver extending the whole-battle
  test, main) + rung 9 (commentary favorite-type/battle-style rules with
  OFF compare, side) launch this round; then rung 11 (controller owns one
  real battle lifecycle) and rung 12 (seven battles). Equal-speed pre-hook
  receipt barrier stays intact.
- **Notes:** whole-battle reachability exposed and fixed two narrow over-
  barriers: inactive move-end cure items now pass unless their matching
  status/stat condition exists; trainer faint replacement selects the sole
  legal bench mon without entering outcome-irrelevant pass-2 damage scoring.
  Competitive multi-candidate damage fallback remains explicitly barriered.
  No barrier count/ratchet moved; no canonical recording, issue, round/swap,
  generation, scout/probe/battle-lab, or presentation file changed.
  PAPERCUT: none.

---

## 670 — [BOUNDED MAIN WORKER 2026-07-29 ~00:10] pre-first-turn entry hooks implemented

- **State:** committed `a5358114`; tree green at **455 files / 4907 tests**,
  production build, `git diff --check`, and Battle Scene OFF oracle info.
  Required lifecycle/switch-in focus is **48/48**; expanded lifecycle/shared-
  selector/ratchet focus is **73/73**. Ability/item extraction + census
  regenerate byte-identically at **69/69 abilities (1096/1096)** and **42/42
  hold effects (850/850)** with all 17 validations.
- **Did:** `TryDoEventsBeforeFirstTurn` now stable-orders the two actives from
  draw A, documents the Factory battle room's `WEATHER_NONE` overworld no-op,
  runs shared weather/form ON_SWITCHIN dispatch fastest-to-slowest, then
  resolves pending Intimidate, pending Trace, and speed-ordered switch-in
  items before draw B. Lifecycle events are returned in exact kernel order
  and seed the first boundary's next event sequence. White Herb restores
  Intimidate-lowered stages and consumes through its shared Battle Script.
  The shared switch-in port also now source-correctly sets both temporary and
  permanent Sand Stream/Drought weather bits and resolves literal
  `BS_BATTLER_0` for weather animations.
- **Supervisor fold (same round, side merge):** rung 8 landed (`244cce0f`)
  — `factoryOpponentGeneration.ts` ports trainer selection +
  GenerateOpponentMons (set retries, duplicate species/item exclusions with
  cited lines, the retail fixed-IV bug preserved: opponent IVs use the
  Battle Tower L50 streak per `battle_tower.c:1832-1847`) with a unified
  position-by-position draw ledger; includes a reachability proof that the
  high-tier rejection has no valid L50 seed. Union green **456 files /
  4913 tests**, census no-op. Scenario-fixture replacement honestly
  deferred (would edit the roundController seam — rung 10/11 territory).
- **Next:** rung 4 (fresh 3v3 battle → real terminal, main) + rung 10
  (swap/heal + full rental record unification, side) launch this round;
  the equal-speed tie receipt stays a separate evidence task — do not
  widen or remove its barrier.
- **Notes:** citations in scout §3.2/§3.3/§4.1 were re-derived from
  `battle_main.c:3841-3929`, `battle_util.c:2485-2600,3003-3073,3303-3329`,
  and the Factory room map's `WEATHER_NONE`. Real L50 carriers pin
  Intimidate (Ekans 53), Trace (Porygon2 436), and White Herb (Kirlia 48);
  Drought uses a complete adapter-shaped Groudon because no L50 corpus set
  carries it. Hook scripts draw zero RNG; hook and no-hook cases remain
  exactly A/B-only. The hook-loop `unsupported-branch` is retired and the
  module ratchet moves **2→1**; the equal-speed receipt-gated barrier is the
  sole remainder. No canonical recording, scout/probe/battle-lab, issue,
  generation, presentation, or opponent-owned file changed. PAPERCUT: none.
