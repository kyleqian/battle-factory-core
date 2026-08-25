# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1401 — [ts worker, 2026-08-25 ~16:47] **ISSUES #128 CLOSED both halves: stock-ROM receipt first (Intimidate/Trace DO write `BATTLE_HISTORY->abilities[0]`, the PLAYER's slot, costing the AI 8 `Cmd_get_ability` draws), then the three-site fix + the history-before-trapper order**

- **State:** #128 is fully landed and deleted from `ISSUES.md`. Receipt
  `bf1a5484`, fix `fdc21ede`, trajectory re-pins `c2fd533c`. Green at HEAD:
  `npm test` **1,143 files / 10,563 passed / 223 skipped / 0 failed**,
  `npm run build` green, `npm run typecheck` green,
  `npm test -- tests/factoryAi` 32 files / 1,432 tests green.
- **RUNG 1 — receipt (stock ROM, tree unchanged).** Three `mechanicLab`
  `overrides.parties` arms against the same two-ability player lead Golduck
  (set 418, `ABILITY_DAMP` / `ABILITY_CLOUD_NINE`), all four AI slots one
  move. `BATTLE_HISTORY->abilities[0..3]` read right after battle start via
  `gBattleResources` → +24 (`struct BattleResources` member 6) → +64
  (`struct BattleHistory`: `usedMoves[4]` × 16 bytes), `include/battle.h`:
  - **INTIMIDATE** (AI Mightyena, set 202): **`[22, 0, 0, 0]`** — holder is
    battler **1**, record lands on **0**. **PREMISE HELD.**
  - **CONTROL** (AI Poochyena, single-ability Run Away 50): **`[0, 0, 0, 0]`**.
  - **TRACE** (AI Gardevoir set 813, `abilitySlot 1`): **`[6, 0, 0, 0]`** —
    the *copied* Damp, again on slot 0, not on the tracer.
  Every `Random()` in turn 2's `HandleTurnActionSelectionState` window
  attributed to its caller by targeted single-step (pass-1 `sRandCount`
  totals reconcile 1:1 with pass-2 hits in all three arms): control **14**
  draws = `Cmd_get_ability` **8** + `BattleAI_SetupAIData` 4 +
  `BattleTurnPassed` 1 + `ChooseMoveOrAction_Singles` 1; intimidate and trace
  **6** each = `Cmd_get_ability` **0** + the *identical* 6-draw remainder. So
  a non-zero `abilities[0]` removes exactly 8 `get_ability AI_TARGET` guesses
  per AI decision. Each arm run **twice** from a fresh oracle,
  **byte-identical** (`a2194263…` / `c24e3d54…` / `9f520f8f…`).
  Receipt `tools/probe/receipts/issue128-ability-history-off.json`; probe
  `tools/probe/probe-issue128-ability-history-off.py`; fixtures from
  `tools/probe/generate-issue128-ability-history-fixtures.ts`. (The battle-lab
  checkpoint already sits inside turn 1's selection run — the AI has committed
  and Intimidate has already fired — so the first fully observable AI decision
  is turn 2's.)
- **RUNG 2 — fix (3 sites + order, all mutation-checked).** (1)
  `factoryBattleStart.ts` Intimidate/Trace loops now call
  `recordBattleScriptAbilityReveal(rules, 0, …)`. (2)
  `battleScriptFaintedActionsOrchestration.ts` state 6: both holder-index
  writes → index 0. (3) `factoryAiCheckBadMove.ts` `nextGetAbilityDraw` +
  `checkAbilityAiTarget` test `knownAbility` **before** the trapper shortcut
  (`factoryAiCheckViability.ts` already had it). New
  `tests/issue128AbilityHistoryReceipt.test.ts` (10 tests) drives all three
  arms through battle start + the first live AI decision and pins the ROM's
  8-vs-0 draw delta; the fainted-actions suite gains slot-0 Intimidate and
  Trace pins. Reverting each item fails 5/7, 2/11 and 1/10 respectively.
- **Next:** supervisor reruns the gates. **The vanilla soak canary trajectory
  is EXPECTED to move** — source-required draws are now removed whenever an
  Intimidate/Trace lead faces a two-ability player mon. Not a regression.
- **Notes:** no existing test pinned the holder index, so nothing needed
  re-pinning there; the AI parity suites were green before and after. Three
  Tier-1 **trajectory** tests did move and were re-pinned in their own commit
  (`c2fd533c`), all self-authored curated-seed scenarios, none an
  oracle-verified ROM trajectory: `factoryWholeBattle` (Granbull/Intimidate vs
  Azurill/two-ability — #128's exact shape: 12 → 13 AI decisions, cursor 196 →
  199), `factoryBrainRoundShape` (SILVER_SEED 4 → 1, GOLD_SEED 2 → 8; the
  file's own "pick a different seed" throw is the designed remedy),
  `factoryRoundChaining` case (b) (seed 0 → 3). Live AI receipts unaffected as
  predicted: `verify-factory-ai-cbm-preamble-live.ts` 4/4 MATCH and
  `verify-factory-ai-curse-live.ts` 6/6 PASS (both stage single-ability
  species). `docs/ability-item-parity-census.md` moved by pure line drift from
  the new source-cite comments (same four `factoryAiCheckBadMove.ts` sites,
  same abilities) — regenerated, all 17 validation checks pass. Executable
  frontier ratchet untouched; no new `unsupported-branch` barrier.

---

## 1400 — [ts worker, 2026-08-25 ~16:05] **Ability activation-path audit COMPLETE: 38/38 SOURCE-EXACT after the second pass; the first pass's 3 DIVERGENT rows are REFUTED, and one new real finding replaces them — Trace's `RecordAbilityBattle(0, copiedAbility)` is unported (RNG-stream affecting)**

- **State:** `docs/ability-activation-audit-2026-08-25.md` is finished — all
  38 L50-carrier no-receipt abilities paired source↔engine at cited
  `file:line`, both halves opened at HEAD. **SOURCE-EXACT 38, DIVERGENT 0,
  UNVERIFIED 0**; 12 individual *sites* inside exact rows are
  UNREACHABLE-IN-FACTORY-L50 with proof (Battle Palace, Battle Arena, Battle
  Pike, doubles-only AI labels, the roaming AI, overworld, and the Frontier
  disobedience short-circuit). Docs-only: only this doc and PROGRESS.md
  changed, so 1398's gates stand (`npm test` 1,140 files / 10,542 passed /
  223 skipped; `npm run build` green). Full suite deliberately not re-run per
  the step brief; `npm run build` + `npm run test:smoke` re-run green.
- **REFUTED (was 1400's headline).** The Magnet Pull / Plus / Minus
  "`ABILITY_ON_FIELD2` writes a false ability onto battler 0" finding is
  **wrong**. `AbilityBattleEffects`' record tail (`battle_util.c:3194-3195`)
  is guarded by `caseID < ABILITYEFFECT_CHECK_OTHER_SIDE`, and that constant
  is **12** (`include/battle_util.h:24`) — the first pass read it as 15,
  which is `ABILITYEFFECT_CHECK_FIELD_EXCEPT_BATTLER` (`:27`).
  `ABILITYEFFECT_FIELD_SPORT` is **14**, so `14 < 12` is false and **no
  record is written**. All three rows are SOURCE-EXACT; the port's extra
  `absentBattlerFlags` skip (`factoryAiSwitchPolicy.ts:252`) is
  singles-unreachable, and `damageCalc.ts:370-376` matches the ungated
  `default:` scan.
- **NEW F1 (real, ranked top).** The same tail *does* fire for
  `ABILITYEFFECT_TRACE` (**11** < 12) and `ABILITYEFFECT_INTIMIDATE1/2`
  (9/10). Both Trace dispatch sites pass the literal `battler = 0`
  (`battle_main.c:3882`, `battle_util.c:1960`), so a successful copy runs
  `RecordAbilityBattle(0, copiedAbility)` — in Factory singles that is the
  **player's** slot, handing the AI the player's real ability and removing
  the `Random() & 1` two-ability guess from `Cmd_get_ability` (`:1361` ahead
  of `:1383`) — an **RNG-stream** divergence. The port writes nothing at
  battle start (`factoryBattleStart.ts:484-513`) and writes the *tracer's*
  index post-faint (`battleScriptFaintedActionsOrchestration.ts:454-459`).
  16 L50 carriers (Porygon/Porygon2/Gardevoir). **F2:**
  `factoryAiCheckBadMove.ts:720-725,772-776` tests the trapper abilities
  **before** the history cache, inverting source order — latent today, live
  the moment F1 is fixed. **Adjacent (out of scope, recorded not filed):**
  Intimidate shares the tail and its battler-0 record is outright *false*.
- **F3 RESOLVED.** The coverage baseline's "Trace never on a lead in 114,756
  samples" is **instrument sampling, not a resolution bug**:
  `randomRoundSoakCoverage.ts:547,567-583` samples
  `rulesContext.battlers[i].ability` on the first ticked frame, and
  `createFactoryBattleStart` has already overwritten the tracer's slot with
  the copied ability (`factoryBattleStart.ts:494-501`) before that frame
  exists. `ABILITY_TRACE` is structurally uncountable there.
- **Also corrected in the doc:** Liquid Ooze — Absorb **adds** the
  `DMG_CHANGE_SIGN` (`battle_scripts_1.s:348-350`), Leech Seed **skips** it
  (`:3271-3276`); the first pass's one-line gloss said "skips" for both.
  Shield Dust's `flags == 0` stat-drop gate **is** implemented
  (`battleScriptStatBuffs.ts:278`). Rock Head has **no** AI site at all
  (`rg -i recoil` over `battle_ai_scripts.s` + `battle_ai_script_commands.c`
  = 0 hits).
- **Next:** supervisor files **one** ISSUES entry from §Findings F1 (proposed
  text is in the doc, and should name F2's file:line so both are fixed
  together; caseIDs 9/10/11 share the tail) and stages the `mechanicLab`
  recipe there for a stock-ROM receipt before any fix. No further audit work
  on this doc — it is complete. `docs/soak-coverage-baseline-2026-08-25.md`
  §6b's `unknown` WHY for Trace should become a sampling note next time that
  doc is regenerated.
- **Notes:** throw-site census re-run this session
  (`python3 tools/probe/premise-census.py --only <file> --premise`; the file
  is not executable). Five premise-worded throws sit on audited paths
  (`factoryBattleStart.ts:242,307,320`, `battleScriptHitChainOpcode.ts:3475`,
  `battleScriptMoveEndOpcode.ts:271`) — all hold, none was reached; they are
  tabulated in the doc header. Engine comments claiming parity were
  re-derived, not trusted: `battleScriptStatBuffs.ts:16-19`'s Shield Dust
  claim turned out to be correct but *narrower* than the first pass read it.

---

## 1398 — [supervisor wind-down, 2026-08-25 ~14:00] **Instrument + census day: premise-throw audit (50/50 classified; its top finding refuted by supervisor), #127 found+fixed with a stock-ROM receipt, #125 CLOSED (2 levers + a trap-gate regression), soak `--coverage-json` / `--policy coverage-fight` / `--parallel N` landed; ~2,400 varied chains and boot rounds 0 CRASH / 0 HANG; move+effect universe 276/276 + 166/166 executed; all five gates green on the final tree**

- **Final gates on THIS tree (`679b3ade`, supervisor's own runs, all
  `--parallel`):** vanilla 0:20 **20/20**, full 0:60 **60/60**, winning
  0:60 **60/60**, winning-swap 0:60 **60/60**; fifth gate — winning
  `--vary-rng --first-round` carry 0 **500/500**, carry 14 **500/500**,
  carry 28 **500/500**, winning-swap carry 0 **500/500** — **`budget` 0 on
  all four** (baseline had 2 at carry 14). Full `npm test` **1,129 files /
  10,513 passed / 224 skipped**; `npm run build` green. DEFERRED.md: no
  open entries. ISSUES closed today: **#125, #127** (filed + fixed same
  day) and **#124** (Rust lane's mirror landed on `rust-main`, verified by
  the fold below); open: #121 (dormant, lead added), #109/#114
  (doubles-era), #71/#73/#39/#55 (parked). Worker spend ≈ $45 over 11
  rounds (0 failed steps; 2 cap-kills and 1 sibling-kill salvaged with the
  work committed).
- **Wind-down folds (after both sibling caps ended 14:48; final tree
  `72a4777a` = this docs commit's parent):** `animation-main` (23 commits,
  Level-50 exact 208→211/276 + Scene-ON `battleScene.ts` draw cases +
  evidence tooling) merged `60ba74d1`; `rust-main` (10 commits: ORWORD,
  CheckViability tie-receipt = **#124 mirror**, Encore, field-ability scan,
  Helping Hand ports) merged `72a4777a`; both clean. Union verification
  (my own runs): `cargo test` **1,068 passed / 0 failed**; wasm rebuilt
  (506,009 B, sha256 `de2fdfdf…`); the 20 `*Parity*` suites under
  `POKEBENCH_ENGINE=wasm` **924/924** (the #124 case now runs, was 1
  skipped); full `npm test` **1,140 files / 10,542 passed / 223 skipped**;
  `npm run build` green. Neither branch touches the Scene-OFF engine, so
  the five gates above (on `679b3ade`) stand for this tree. **#124
  deleted.** Both sibling ledgers' top entries carry no "For the main
  program" ask.
- **Round 12 (bonus, after the folds):** `tools/probe/premise-census.py` +
  `tools/test_premise_census.py` (ts sonnet, 8 min; `835ece9f`, worker
  ledger note folded here from its own `f7bb5514`): reproducible
  premise-throw census — reassembles wrapped `throw new <X>Error(...)`
  messages, attributes the enclosing function, TSV + `--only/--premise/
  --summary/--exclude-unsupported-branch`; 5/5 tests, ~1.3 s. On this tree
  `src/engine` = **1,573 sites / 256 premise-worded** (the audit's rg-based
  1,554 / 235 counted only the literal `Error` class and used a slightly
  different word list). Weakness to know: exported arrow/const functions
  attribute as `<anonymous>` (e.g. the Bide canceler site). PAPERCUTS entry
  deleted. Docs-only + Python; the gates and suites above stand.
- **Orient state:** master = `dbe18b3d` = `animation-main` tip. The live animation
  supervisor merged master `33592cba` into its branch at 08:48; my fold then
  fast-forwarded master onto that merge — one commit, both branches converge
  (4 animation commits folded: Screech Scene-ON exact + ratchets). `rust-main`
  had 0 commits to fold. Union `npm test` **1,125 files / 10,467 passed / 224
  skipped**; `npm run build` green. Both sibling Codex supervisors (animation,
  rust) are LIVE since 08:48 with 14:48 caps. Oracle freshness FAIL judged a
  false positive again (last `oracle/` commit 08-15 09:51 is client-side
  factoryBrain staging; only docs/engine commits since) — NOT restarted, the
  siblings are on the shared services. DEFERRED.md: no open entries.
- **Did so far (3 worker rounds):** (1) **Premise-throw audit** (ts opus
  ×2, 15.7 + 19.5 min, $10.4): `docs/premise-throw-audit-2026-08-25.md` —
  1,554 throw sites → 50 live-kernel premise-worded sites, ALL classified:
  **PROVED 10 / TS-CONTRACT 36 / UNPROVEN 4 / UNCLASSIFIED 0**. The first
  pass's top finding (Bide `CANCELER_BIDE` absent-target redirect, "Draft C")
  was **refuted by my own verification**: every `gAbsentBattlerFlags |=`
  site it cited sits in `Cmd_openpartyscreen`'s `HasNoMonsToSwitch` branch
  (`battle_script_commands.c:4865-5150`), never on faint — the port's
  invariant holds; the second pass then refuted Drafts B/D/E on evidence.
  Survivors: **#127 filed** (Baton Pass → Spikes KO → second
  `openpartyscreen` inside the #89 mid-action resume → throw at
  `factoryBattleScriptFullTurnDecision.ts:2564`; the #119 dance path already
  republishes the same halt) and a #121 lead (two more `monToSwitchIntoId`
  lifecycle writes). (2) **#125 lever 1** (side sonnet, cap-killed at 45
  min under load ~40 with the work committed: `a030faf9` → merge
  `3b96ceb6`): maxed-stat-stage status slots skipped in the winning-like
  fallback, 3 pins mutation-checked, carry-14 fifth gate 500/500 (`budget`
  2, unchanged) — necessary, not sufficient: seed 116's transcript shows
  FIGHT → Struggle for 1,700 turns with every slot at 0 PP; #125 trimmed to
  lever 2 (switch when no usable PP). (3) Census batch A (six `--vary-rng`
  full-chain sweeps, `--render-every 64`, 0:100 each — winning-swap c14/c28,
  winning-coverage c0/c14, full c0/c14): in flight, 0 CRASH / 0 HANG so far.
- **Did (rounds 4-5):** (4) **#127 FIXED** (ts opus, 48 min, $5.1;
  `f018c5b8` fix + 3 mutation-checked pins + lab scenario, `6f1d4717`
  ground truth): the stock ROM DOES open the party screen twice inside one
  Baton Pass action (`playerControllerCommand` 22 at frames 880 and 2220,
  no turn boundary; recipe: Aipom Swords Dance → Cloyster SPIKES ×4 → Baton
  Pass to Shedinja, whose 1 max HP makes any layer lethal — real damage
  only); the #89 resume now republishes the second forced switch like the
  #119 dance path; passed stages do NOT chain past the KO; second switch
  spends no RNG. Full suite 1,126 / 10,473 / 224 on `f018c5b8`, build green.
  **#127 deleted.** (5) **Soak coverage instrument** (side opus, killed by
  a sibling's pattern kill — see below — with the work committed
  `91938de7` → merge `4aa81ff5`): `--coverage-json` aggregates executed
  moves/effects (from `STRINGID_USEDMOVE` resolution receipts, both sides),
  species seen, abilities/items PRESENT at battle start, vs the L50 corpus
  (740 sets: 276 moves / 166 effects / 264 species / 71 abilities / 40
  items); 8 pins. Demos: 50 `winning-coverage --first-round` seeds → moves
  169/276, effects 110/166, species 134/264; 5 `winning` full chains →
  **223/276 moves, 139/166 effects, 155/264 species, 64/71 abilities, 36/40
  items**. One tsc error in its test (vitest does not typecheck) fixed by me
  (`ba325c4b`).
- **Incident:** the #127 worker ran `pkill -f "randomRoundSoak"` three
  times (10:08/10:23/10:33) to stop its own over-long gates; the pattern
  killed all ten in-flight census sweeps AND the coverage worker (its brief
  text matched; SIGTERM 143 at 23 of 50 min). Batch A's four winning-like
  sweeps stood at 83/100 each, 0 CRASH / 0 HANG; batch B at 12-20 seeds.
  Relaunched from the last completed seed at 10:37; three PAPERCUTS entries
  (`bfc91c90`); briefs now forbid pattern kills and cap soak runs at ~3 min.
- **Did (rounds 6-7):** (6) **#125 lever 2** (side sonnet, 19.7 min,
  $1.4; `54ad24a7` → merge `4dbe8fe9`): the winning-like switch path
  (`pickWinningSwitchRow` C2) now also fires on forced Struggle (every slot
  0 PP) whenever a bench mon has a usable non-immune damaging move; 3
  mutation-checked pins; seeds 116/418 (`winning --vary-rng --first-round`
  c14) and 755 (`winning-combined` c28) go `budget` → `roundLost` (my
  rerun agrees); carry-14 first-round 0:100 **100/100, budget 0** (was 2).
  **#125 deleted.** Trajectory re-baseline → all gates rerun at wind-down.
  (7) **`--parallel N` seed fan-out** (ts opus, 20.7 min, $2.8; `b16e9009`):
  `randomRoundSoak.ts` spawns N contiguous-slice children, prints per-seed
  lines in seed order, merges `--json`/`--coverage-json`
  (`mergeCoverageReports`), summary lifted into `printSoakSummary`; 6+4
  pins incl. serial-vs-parallel deep-equality (mutation-checked); default 1
  byte-identical. Measured 38.0 s → 21.6 s at `--parallel 4` under load 62
  (contended floor); full suite 1,128 / 10,487 / 224 on `b16e9009`.
  Census batch A COMPLETE: **600/600 varied full chains, 0 CRASH / 0 HANG**
  (winning-swap c14/c28, winning-coverage c0/c14, full c0/c14; 83:100
  tails rerun after the pattern kill).
- **Did (rounds 8-9):** (8) **`--policy coverage-fight`** (side opus, 41.6
  min, $3.9; `77db3504` → merge `f6c98cf0`, one conflict in
  `randomRoundSoak.ts` resolved by me: fan-out kept + policy added to the
  validation list): winning-coverage's draft, `winning`'s switch/swap
  rules, FIGHT = least-used legal move (run-wide tally, ties → lowest slot);
  8 pins (mutation-checked). On 100 boot rounds it executes **2× the
  player-side distinct moves (140 vs 70) and 2.3× the effects (95 vs 42)**
  of winning-coverage; run totals look lower only because it loses more
  (271 vs 534 battles). Its first census: first-round `--vary-rng` c0/c14/
  c28 **300/300 each** (c14 `budget` 2 = trapped + out-of-PP Struggle, the
  accepted #125 residual) + full chains c0/c28 **20/20 each** — 0 CRASH /
  0 HANG. (9) **Lever-2 regression fixed** (side sonnet, 29 min, $2.8;
  `c8c94f5c`): my carry-14 gate diagnostic found seed 406 ping-ponging
  "switch row 1" ↔ "party: cancel" for the whole budget — the engine's
  `legalCommandDecisions` never publishes a switch while the player is
  trapped (`factoryBattleScriptFullTurnDecision.ts:2085-2153`; Shadow Tag
  here) and lever 2 ignored trapping; the driver now mirrors the trap gate
  (`isPlayerVoluntarySwitchTrapped`, 12 pins) → seed 406 `roundLost`,
  116/418/755 still resolve, carry-14 first-round 0:500 **500/500 budget 0**.
- **Mid-session gates on `4dbe8fe9`+ (with `--parallel`):** vanilla 0:20
  **20/20**, full 0:60 **60/60**, fifth gate **500/500 ×4** (c14 `budget`
  1 = seed 406, fixed above); winning/winning-swap 0:60 still running.
- **Did (round 10):** census batch B COMPLETE and clean (winning c0/c14/
  c28 + winning-swap c0 at 113:200, winning-coverage c28 13:100, full c28
  21:100 — **0 CRASH / 0 HANG**; with batch A that is ~1,200 varied full
  chains + 900 coverage-fight boot rounds today, all clean).
  **Coverage baseline** (ts opus, 19 min, $2.8; `3e19fd17`, two new files:
  `docs/soak-coverage-baseline-2026-08-25.md` +
  `tools/soak/mergeCoverageReports.ts` CLI, my rerun agrees): union of 15
  coverage JSONs (1,522 seeds, 57,378 battles, 910k turns) — **moves
  276/276, effects 166/166** (the L50 universe is closed by today's
  policies), species 252/264 (12 never — the carry-49 tier, closable in
  ~2.5 seed-min), abilities 70/71 (Trace "never present" = sampling after
  switch-in overwrote the slot with the copied ability, not a drop), items
  40/40. `full` is dominated on every dimension — retire it from census
  duty (gates unchanged).
- **Did (round 11):** **activation coverage** (side opus, 18.8 min, $4.7;
  `3a445bc3` → merge `4638ff98`): the instrument now also counts ability
  and held-item ACTIVATIONS (announced message buffers + typed holder
  receipts; silent-by-construction classes listed in the module header);
  12 pins. The brief's "activated ⊆ present" clause was empirically FALSE
  (presence samples battle-start actives only; switched-in mons activate
  unseen) — the worker pinned the true relations and documented it rather
  than force it. 30 coverage-fight boot rounds: abilities 41/71 present ·
  **12/71 activated**, items 22/40 present · **11/40 activated**. Docs
  (`4871e189`): SUPERVISOR.md gate text gains `--parallel` + the
  no-pattern-kill rule; `docs/soak-crash-catalog.md` entry for today.
- **Carry-49 sweep** (coverage-fight first-round 0:300): **300/300 OK**
  (1 `budget`); union coverage over all 16 reports → species **263/264**
  (only UNOWN never drafted), abilities 70/71 (Trace = overwritten at
  switch-in by the copied ability, `battle_util.c` ABILITYEFFECT_TRACE —
  instrument sampling, not a drop), moves/effects/items 100%.
- **Sibling folds:** both sibling Codex supervisors were live all day
  (caps 14:48). At ~14:00 `animation-main` is 16 ahead (Scene-ON
  `battleScene.ts` draw cases + `src/animation`/`tests/animation`/
  `tools/compare` evidence) and `rust-main` 9 ahead (Helping Hand /
  jumpifabilitypresent / Encore ports + the **#124 un-skip** in
  `tests/factoryAiCheckViabilityParity.test.ts`; nothing under `src/`).
  Fold + cargo/wasm/parity verification runs after their caps end — result
  appended below; the five gates above stand either way because neither
  branch touches the Scene-OFF engine.
- **Next session:** (1) if `rust-main` folded green, delete #124; (2) more
  census is cheap now (`--parallel`, coverage-fight at carry 49, seeds
  ≥ 300) but the universe is closed — the next crash finder is
  INTERACTION coverage (never-activated abilities/items from the activation
  dimension; stage them via `mechanicLab`), not more seeds; (3) filler:
  `tools/probe/premise-census.py` (PAPERCUTS), broaden coverage "presence"
  to the whole party, retire `--policy full` from census duty (gate stays);
  (4) parked: #71/#73/#39/#55; dormant #121; doubles-era #109/#114.

---

## 1396 — [top-layer setup session, 2026-08-24] **Two user decisions recorded + next-supervisor mission staged: draft-lever program CLOSED, varied-RNG standing gate ADOPTED (shape defined after the #122/#123 fixes); orphaned Rust Refresh-port worker commit found unfolded**

- **State:** docs-only commit on top of 1395's fully-gated tree (no
  `src`/engine edits at this layer). Oracle services verified live: main
  8012 (`bin/oracle info` answers), animation 8014, node harness 8001.
  DEFERRED.md: no open entries. Tree was clean at audit start.
- **Did (top-layer audit of what the next supervisor inherits):**
  (1) **User decision:** the draft-lever program is CLOSED — 1395's
  `--vary-rng` measurement settled it (challenge 4 was one losing deal, not
  a wall; the best lever gains ~2 points, z ≈ 1.7, no policy separates
  decisively). `winning-combined` stays available opt-in; no further
  draft-axis measurement sessions. (2) **User decision:** varied-RNG crash
  sweeps BECOME A STANDING WIND-DOWN GATE — adopted in principle
  2026-08-24; the supervisor defines the exact shape (carry tiers × seed
  count) AFTER #122/#123 are fixed and pins it in SUPERVISOR.md next to the
  four existing gates (which stay unvaried). (3) **Found: orphaned worker
  commit** — `worker/rust-20260822-123947` (`81609f44`, "Port Refresh
  battle script opcode to Rust": impl + 36k-line vectors + tests, Codex
  sol/high, 2026-08-22 12:49) is in NEITHER `rust-main` NOR master; it
  predates that day's night session and was never folded.
- **Next (the supervisor mission, in order):** (1) fold `animation-main`
  (9 commits, idle since 08-23 03:21) at orient; (2) triage + fix **#122**
  (start: which of the 13 expected draws diverged at draw 11) then **#123**
  (PP legality on the fallback path + Struggle engagement); both repros are
  in ISSUES.md (0.1 s and ~27 s, deterministic); (3) define + land the
  varied-RNG gate, pin its text in SUPERVISOR.md, record baseline counts;
  (4) verify (cargo + wasm parity) and fold-or-discard the Refresh worker
  branch, with the reason recorded; (5) delete
  `wip/mb-step2b-draft-heuristic` (program closed; git retains). Open
  ISSUES after this queue: #121 (dormant), #109/#114 (doubles-era),
  #71/#73/#39/#55 (parked/filler).
- **Notes:** a Codex supervisor for a DIFFERENT repo (`pokered-pewter`)
  holds an 8 h cap until ~04:40 on 08-25 — expect CPU contention for soak
  sweeps if this repo's supervisor launches before then. The four standing
  gates stay UNVARIED baselines; the new gate is additive crash coverage,
  not a replacement. 1395's trap reminder stands: use exact filenames when
  policy names share prefixes (`m-winning-*` glob collision).

---
