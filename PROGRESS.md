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

## 673 — [BOUNDED MAIN WORKER 2026-07-29 ~01:15] controller owns one generated battle lifecycle

- **State:** Gate-5 plan rung 11 is committed at `9a741230` and green at
  **461 files / 4956 tests**, production build, `git diff --check`, Battle
  Scene OFF oracle info, and focused round/whole-battle compatibility
  **34/34**. Executable (**214/214 effects, 355/355 moves**) and ability/item
  (**69/69 abilities, 42/42 hold effects**) censuses regenerate
  byte-identically.
- **Did:** added a production-shaped round/battle orchestrator with generated-
  initial-rental or current-full-record entry modes. It admits a complete
  rung-8 trainer/party only at the controller's existing `battleStart`
  transition, starts the fresh kernel after presentation acknowledgement,
  routes player decisions through its published boundary, routes every
  trainer command through the rung-6 live AI, overlays terminal mutable state
  onto the full rental identities, adapts the real terminal, and calls
  `resolveRoundBattle`. The fixture scenario/resolution ABI remains intact.
- **Acceptance:** seed 4 pins battle 0 trainer 17/sets 122,118,110 → real
  3v3 win → swap offer → DECLINE → battle 1 trainer 51/sets 199,178,148 →
  fresh player command. The single facility cursor is exact:
  **152 generation + 175 battle + 112 next-generation + 2 fresh-start =
  441 calls**; segment endpoints are pinned as
  `4→2423399196→3960941853→2133491021→1174811135`. No fixture resolution
  occurs anywhere in the carrier.
- **Supervisor fold (same round, side merge):** the equal-speed tie receipt
  landed (`9eec0e10`, Terra) — one added draw between A and B from
  `GetWhoStrikesFirst+0x3b1`, tie `&1=1`, order `[1,0]`; per-case process
  isolation fixed the prior instability; wrapper re-run fresh by the
  supervisor: both cases PASS. The fresh-start barrier may now retire in a
  main-lane step that consumes the receipt.
- **Next:** rung 12 (seven-battle loop, accepted swap, streak/terminal
  facility state, multiple seeds, loss control, main — rung (a): retire the
  equal-speed barrier against the receipt) + rung-13 ground-truth scout
  (AI switch/history breadth — mission-scope-checked: opponent switch AI is
  NOT excluded by the mission brief, side). Rung 14 remains
  commentary/presentation wiring.
- **Notes:** scout §2.1's frozen claim that Factory selection still required
  fixture parties was proved at the live seam; the minimal adapter now accepts
  a complete generated opponent while reusing the controller's index/heal/
  presentation transition unchanged. Rung-10 compatibility exposed that the
  normalized kernel party drops corpus-only identity metadata; terminal HP/
  PP/status/item are therefore overlaid onto the controller's full identity
  records before healing (no controller rule moved). No ratchet/barrier,
  census artifact, issue, scout/probe/battle-lab, commentary/presentation, or
  canonical-recording file changed. PAPERCUT: none.

---

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
- **Supervisor fold (same round, side merge):** rung 9 landed (`a9f22553`
  + `833b61ee`) — `factoryCommentary.ts` ports favorite-type and
  battle-style rules (every branch incl. TYPE_MYSTERY's tally-only
  exclusion and no-singular-style; 35 focused tests; two rung-8 seeds
  produce different commentary) with an OFF canonical scouting compare
  **164/164 exact**. Wiring point identified (postwin.ts:100/:300,
  core.ts:1806), deferred to rung 11/14; the two-party pre-scout fixture
  (`opponentSetIds`) is the named follow-up. Union green **460 files /
  4955 tests**, census no-op.
- **Next:** rung 11 (controller owns one real generated battle lifecycle,
  main) + the equal-speed tie receipt via the narrower instrument (side)
  launch this round; then rung 12 (seven battles). Rung 13 remains the
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
