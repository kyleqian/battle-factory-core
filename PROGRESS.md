# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 896 — [bounded MAIN worker, 2026-08-03 ~16:35] ISSUES #72 batch 1: 11 REACHABLE printstring STRINGIDs landed via the Taunt-pair idiom

- **State:** master, on top of `896`'s parent (`49763783`). `npm run
  test:smoke` green (346/346) mid-step; full `npm test` + `npm run build`
  pending as this entry's own finish requirement (see Next if not yet run
  when this lands).
- **Did:** Landed 11 of ISSUES #72's ranked REACHABLE printstring STRINGIDs
  (census: 107→96 UNRESOLVED, 13→24 already-explicit, exact -11/+11 match):
  the "already status" five (`PKMNISALREADYPARALYZED`/`ALREADYCONFUSED`/
  `ALREADYASLEEP`/`ALREADYPOISONED`/`ALREADYHASBURN`, all pure
  `jumpifstatus(2) BS_TARGET` generic opcodes), `PKMNWASDEFROSTED`,
  `PKMNFELLINLOVE`, and the ability-blocks-the-move's-own-target-effect
  cluster (`PKMNPREVENTSSTATLOSSWITH`/`PREVENTSCONFUSIONWITH`/
  `PREVENTSROMANCEWITH`, `PKMNSXCUREDITSYPROBLEM`) — `messageLines`
  (`battleResolutionPresentation.ts`) branches sourced via
  `requireMoveDefender`/`scriptingBattler`, 2 new `prepareMessage`
  substitution cases (`factoryBattleScriptFullTurnDecision.ts`, ability-name
  plumbing for the 4 ids needing `{B_*_ABILITY}`) + 3 new `ABILITY_DISPLAY_
  NAME_BY_ID` entries (Oblivious/Own Tempo/Clear Body). All 11 staged as
  real full-turn production-kernel repros in one new file,
  `tests/presentationStringIssue72Batch1.test.ts` (direct `status1`/
  `status2`/`ability` config staging, the same idiom `factoryBattleScript
  WakeUpFullTurn.test.ts` already established — not an oracle/mechanicLab
  contract, so pre-battle status/ability staging is in-bounds here), all
  red-verified via `git stash -- src/engine/battleResolutionPresentation.ts
  src/engine/factoryBattleScriptFullTurnDecision.ts` (exact completeness-
  guard error pre-fix, confirmed per-id). Deliberately deferred 2 ranked-
  nearby ids needing RNG seed-search this step didn't have budget for
  (`PKMNHUNGONWITHX`'s Focus Band hang-on roll, `PKMNPROTECTEDBY`'s Sturdy-
  vs-OHKO where OHKO accuracy is a ~30%-at-mirrored-levels formula) and
  `PKMNREGAINEDHEALTH` despite its rank 7 (3 emitting labels source
  `{B_DEF_NAME_WITH_PREFIX}` from 3 different battler roles -- self-heal,
  Present's opponent-target heal, Wish's frozen-at-cast battler -- needs its
  own investigation, not one shared shape). ISSUES #72 REACHABLE list
  trimmed to the remaining 56 (heading corrected 66→56: the pre-batch list
  actually enumerated 67 distinct ids against the triage doc's own 66 count,
  a pre-existing off-by-one noted but not chased down).
- **Next:** ISSUES #72 batch 2, starting from `STRINGID_PKMNHUNGONWITHX`
  (now the top of the ranked REACHABLE list) — the FocusBand/OHKO-accuracy
  pair needs a seed search or an alternate deterministic staging approach
  before landing; `PKMNREGAINEDHEALTH`'s 3-context investigation;
  `PKMNSXWOREOFF` (side-status wear-off, `B_ATK_PREFIX1`+`B_BUFF1`) next
  after those. The `CANCELER_TORMENTED` engine-gap fix (separate step, not a
  messageLines fix). The 4 MANUAL settling experiments. #71 Slice D. typeref
  slice-2 re-scope (#39).
- **Notes:** PAPERCUT: the generic-fallback classification in `tools/report/
  printstring-literal-census.ts` is a static syntactic check (does the
  template's placeholder set live inside the 4-token generic-fallback set?)
  but the fallback's actual runtime availability is call-path-dependent
  (`B_SCR_ACTIVE_NAME_WITH_PREFIX` only populates when
  `pendingHeldItemEffectBattler` is non-null, a narrow trigger) — hit this
  live staging `STRINGID_PKMNFELLINLOVE` down a same-turn path that also
  reached `STRINGID_PKMNINLOVE` (classified "generic-ok", 87-bucket) and got
  the completeness guard anyway; worked around by picking a speed order that
  avoids that second print rather than fixing the census method, ~10 min
  lost. Worth a future step: the "generic-ok" bucket may hide more of these.

---
## 895 — [bounded MAIN worker, 2026-08-03 ~16:10] ISSUES #72 reachability triage done: 66 REACHABLE / 37 DEAD / 4 MANUAL of the 107-id printstring census

- **State:** master, docs-only commit on top of `660494f9`. Re-ran
  `printstring-literal-census.ts` first — byte-identical to committed, 107
  UNRESOLVED unchanged, no churn to restore.
- **Did:** Per-id reachability triage of ISSUES #72's 107 UNRESOLVED
  `printstring`-literal STRINGIDs, following #70's method (trigger
  attribution via `battle-script-program.json` call-graph + real-source
  cross-refs, static-gate identification, Factory L50 singles carrier
  evidence via `battle-script-topology.json`'s `level50FactoryReachableEffects`
  + a fresh `battle-frontier-mons.json`↔`species-stats.json` ability join).
  New doc `docs/issue72-reachability-triage.md`: **66 REACHABLE, 37 DEAD, 4
  MANUAL**, every row cited. ISSUES #72 trimmed to the open remainder (full
  REACHABLE list ordered by carrier-weight proxy + the 4 MANUAL cases +
  fix-idiom pointer); nothing marked CLOSED. All 7 user-named
  highest-suspicion ids got explicit verdicts: the 5 "already-status" ids are
  REACHABLE (clean `jumpifstatus`-on-target-already-has-it chains, biggest is
  Thunder Wave's 64/850); `PKMNCANTUSEMOVETORMENT` is a genuine **engine
  gap** (found live this step) — the attack-canceler phase enum has no
  `CANCELER_TORMENTED` phase at all (`battleScriptSourceConstants.ts:69-85`
  goes DISABLED→TAUNTED directly) though Torment itself is inflictable
  (4/850 carrier) — same fix idiom as the Taunt/Imprison pair would unlock
  it; `PKMNCANTUSEMOVESEALED` is MANUAL — engine wiring is real but the
  Imprison carrier is contradicted between two generated artifacts
  (`battle-frontier-mons.json` vs `battle-script-topology.json`'s
  inventory-sourced L50 tier). Second surprise: 3 more MANUAL ids
  (`PLAYERDEFEATEDTRAINER1`/`TRAINER1LOSETEXT`/`TRAINER1WINTEXT`) — real,
  certain triggers on every Factory win/loss, but this engine's terminal
  boundary (`factoryBattleScriptTerminalDecision.ts:612-621`) short-circuits
  before ever resuming the interpreter at those labels.
- **Next:** #72 REACHABLE batch fixes (66 ids, Taunt-pair idiom, ranked list
  in ISSUES #72); the `CANCELER_TORMENTED` engine-gap fix (unlocks 1 more);
  the 4 MANUAL settling experiments if picked up; #71 Slice D (animation
  rung-3 dependency); typeref slice-2 re-scope (#39).
- **Notes:** docs-only step per its own acceptance criteria — no
  `npm test`/`npm run build` run (machine shared with two other lanes today).
  No PAPERCUT. Two research subagents (read-only, no fixes) ran in parallel
  to cover the ability/item/facility clusters within the 60-minute cap; all
  three batches (mine + both agents') cross-verified for row-count/pipe-
  escaping integrity before merge — 107/107, no gaps, no dupes.

---
## 894 — [supervisor orient, 2026-08-03 ~15:35] Animation fold (ff to `660494f9`) verified green on the union; session in progress

- **State:** master `660494f9` = fast-forward fold of `animation-main` (6
  commits: BACK_ANIM_GROW + BACK_ANIM_CIRCLE_COUNTERCLOCKWISE player-back
  sets — 7/25 back sets now ported). The ff target is the animation
  supervisor's own baseline merge of master; both supervisors launched
  14:42 and run concurrently until 20:42. Union verification: `npm run
  build` green (2m33s); full `npm test` **0 test failures** (5,539 passed /
  1 skipped; 5 files hit vitest worker collection *fetch timeouts* under
  triple-suite CPU contention, and all 5 pass targeted — 1,038/1,038 in
  28s). DEFERRED.md: no entries.
- **Did (so far):** fold + union verification above. Session incidents worth
  the ledger: (1) background-task completion notifications fired spuriously
  early twice — acted on one and removed the first #71 side worker's
  worktree while it was still live (worker noticed, reported cleanly, no
  tree damage; its RAM probe was salvaged intact). Re-adopted the
  2026-07-31 kill-0 policy: only process-verified state counts. (2) The
  salvaged probe settled the #71 latent-bug fix shape with real-ROM
  evidence: KADABRA's back settle is its own y2 descent 14→0 (its
  shrink-grow family motion) — NOT flat zero and NOT ONIX's wobble table;
  the tint fade (16→0, −1/tick) is species-generic. Retry brief embeds the
  probe (artifacts: docs-bound copy pending worker; scratchpad backup
  kept).
- **#71 latent bug FIXED and MERGED** (`7e14afae` → merge `cffb7491`,
  ~15:55): ONIX-gated wobble table, species-generic tint kept, probe banked
  at `docs/probes/kadabra-materialize-settle/`. 7 red-verified tests;
  worker full suite green at commit (665 files / 6,584); supervisor
  spot-checks: new test file 7/7 in-worktree, differential
  `battle-command-generated-off.json --base 660494f9` **128/128
  byte-identical**. Oracle-pixel compare deferred into Slice D acceptance
  (see ISSUES #71 + 2 new PAPERCUTS). Post-merge smoke+targeted deferred
  until the live main-lane worker exits (shared-tree discipline).
- **In flight:** main lane — #72 107-id printstring reachability triage
  (user-directed first brief), launched ~15:37.
- **Next:** verify + merge triage; then #72 REACHABLE fixes per triage;
  typeref slice-2 re-scope (#39). Preview server is DOWN (died with last
  session); restart at wind-down on the final commit.

---
## 893 — [bounded MAIN worker, 2026-08-03 ~13:05] Same-day crash FIXED (STRINGID_PKMNFELLFORTAUNT + sibling) + ISSUES #72 filed (107-id census, blind-spot class beyond #70)

- **State:** master `a6d533a7`. Full `npm test`: **660 files / 6,558 passed /
  1 skipped**. `npm run build` green (tsc -b + vite).
  `compare:differential -- battle-command-generated-off.json --base 78fb4ef0
  --summary`: **PASS — 128/128 byte-identical**.
  `tests/executableFrontierRatchet.test.ts` green, untouched, no barrier
  changes.
- **Did:** Fixed the same-day user-reported crash (live preview `3a1e1d8b`:
  opponent MURKROW's TAUNT threw battleStringResolver's completeness guard
  on `{B_DEF_NAME_WITH_PREFIX}`). Mapped `STRINGID_PKMNFELLFORTAUNT` in
  `messageLines` (`battleResolutionPresentation.ts`) — Taunt's own
  `Cmd_settaunt` operates on `gBattlerTarget` directly, so B_DEF is the
  move's own defender, same shape as `STRINGID_PKMNSUBJECTEDTOTORMENT`.
  While staging a real repro (MURKROW's real Factory rental set,
  `FRONTIER_MON_MURKROW_1`), found and fixed a **sibling gap in the same
  turn**: `STRINGID_PKMNCANTUSEMOVETAUNT` (the taunted battler's own blocked
  status-move action, printed by the attack canceler instead of
  STRINGID_USEDMOVE) — sourced from the frozen action snapshot's
  attacker/currentMove, not `lastMoveAttacker` (no used-move message
  precedes a canceled action). `tests/presentationStringTaunt.test.ts`: full
  production-kernel repro, red-verified via `git stash` on the engine file
  (threw the exact reported error pre-fix).
  **Root cause of why #70 missed both:** #70's sweep grepped `src/engine/
  *.ts` for `STRINGID_` TS literals; these two ids are emitted purely by the
  generic `printstring` opcode handler reading the operand straight out of
  the parsed battle-script program — no TS code ever names them, so the
  grep-based method structurally cannot see this class. Wrote
  `tools/report/printstring-literal-census.ts` (regenerable,
  `docs/printstring-literal-census.md`) to enumerate it properly: **207**
  unique literal `printstring` STRINGID operands in the parsed program, 13
  already explicit + 87 generic-fallback-safe, **107 UNRESOLVED**
  (syntactic upper bound, not per-id reachability-traced like #70's own
  method — many are structurally dead, e.g. Battle Arena/link-battle-only
  ids). Filed as **ISSUES #72** with the full list and the 7
  highest-suspicion same-family next picks (PKMNALREADYASLEEP/CONFUSED/
  HASBURN/POISONED/ISALREADYPARALYZED, PKMNCANTUSEMOVETORMENT/SEALED) —
  per the step's own outcome rule (longer tail → file, don't chase).
- **Next:** ISSUES #72's 7 highest-suspicion ids (same "already-status"/
  "can't-use-move-X" family as the just-fixed Taunt pair, same fix idiom);
  the rest of #72's 107-id list needs #70-style per-id reachability triage
  before fixing (many are dead paths, not real gaps); ISSUES #71 remaining
  (Slice D gated on animation lane's rung-3 dispatcher; the
  `drawGeneratedPlayerMaterialize` ONIX-back latent bug from entry 891);
  typeref slice-2 re-scope.
- **Notes:** no PAPERCUT this step. `npm test` auto-backgrounded past the
  harness's 120s default Bash timeout (suite takes ~11min); resolved by
  polling the background output file in a single blocking foreground Bash
  call with an explicit longer timeout, per this run's "never actually
  background a verification" discipline — worth remembering the fix
  pattern rather than re-deriving it next time a full-suite run exceeds
  120s.
- **[supervisor close, 14:05]** the #72 reachability triage (user-directed:
  attribute each of the 107 unresolved printstring ids to its emitting
  move/hook + Factory-corpus carrier + static battle-type gates, partition
  reachable/dead/manual) was launched at 14:02 by supervisor clock error
  and cancelled 2 min in, nothing landed — **it is next session's FIRST
  brief**, fully re-derivable from ISSUES #72 + docs/printstring-literal-
  census.md + the #70 reachability doc's methodology. Second open user
  decision unchanged: non-fatal resolver guard in the playable build.
  Tree clean and green at `78d9efcc`; preview serves `bc763f06` (:5199).
- **[supervisor final addendum, 13:10]** verified (repro test + smoke
  green; worker's same-commit full suite 660 files / 6,558 / 1 skipped;
  differential 128/128). Play-preview rebuilt at `bc763f06`, serving :5199.
  Session final totals: **9 workers (6 main + 3 side), 0 lost.** OPEN
  question for the user (asked live, unanswered at close): make the
  battleStringResolver completeness guard non-fatal in the playable build
  (loud console error + best-effort text) while staying fatal in tests —
  recommended given #72's 107-id tail; next session implements per the
  answer.

