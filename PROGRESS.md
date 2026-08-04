# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 897 — [bounded MAIN worker, 2026-08-03 ~17:20] ISSUES #72 batch 2: 11 more REACHABLE printstring STRINGIDs landed via the Taunt-pair idiom

- **State:** master `1129cece`, on top of `896`'s commit. `npm test:smoke`
  and the two new/red-verified test files green mid-step; full `npm test` +
  `npm run build` + differential pending as this entry's own finish
  requirement (see Next if not yet run when this lands).
- **Did:** Landed 11 more of ISSUES #72's ranked REACHABLE printstring
  STRINGIDs, starting at `STRINGID_PKMNSXWOREOFF` per the supervisor brief
  (skipping the 3 documented hard cases `PKMNHUNGONWITHX`/`PKMNPROTECTEDBY`/
  `PKMNREGAINEDHEALTH`, still unlanded): `PKMNANCHORSITSELFWITH`,
  `PKMNANCHOREDITSELF`, `PKMNWASDRAGGEDOUT`, `PKMNCUTSATTACKWITH`,
  `PREVENTEDFROMWORKING`, `PKMNSXPREVENTSFLINCHING`, `PKMNSXPREVENTSYLOSS`,
  `PKMNPREVENTSUSAGE`, `PKMNRESTOREDHPUSING`, `PKMNSXMADEYUSELESS`,
  `PKMNSXWOREOFF` (census: 96→85 UNRESOLVED, 24→35 already-explicit, exact
  -11/+11 match). Same idiom as batch 1: `messageLines`
  (`battleResolutionPresentation.ts`) branches + `prepareMessage`
  substitution cases (`factoryBattleScriptFullTurnDecision.ts`, 9 new
  `ABILITY_DISPLAY_NAME_BY_ID` entries) — plus two small, scoped additions
  this batch needed beyond that pair: a new optional `targetBattler`
  event-payload field (`battleScriptEvents.ts`, mirroring the existing
  `effectBattler` idiom) for the Intimidate loop's own
  `trygetintimidatetarget` cycling (not a move's-own-target relationship,
  so `requireMoveDefender` doesn't apply), and a `battleTextBuff1Move` write
  in `battleEndTurnOrchestration.ts`'s Reflect/Light Screen/Mist wear-off
  ticks (porting real source's own `PREPARE_MOVE_BUFFER` call — the field
  already existed, used by other ids). All 11 staged as real full-turn
  production-kernel repros in one new file,
  `tests/presentationStringIssue72Batch2.test.ts`, red-verified via
  `git stash -- src/engine/battleResolutionPresentation.ts
  src/engine/factoryBattleScriptFullTurnDecision.ts
  src/engine/battleEndTurnOrchestration.ts src/engine/battleScriptEvents.ts`
  (exact completeness-guard error pre-fix, confirmed per-id). Two ids needed
  genuine 2-turn sequences rather than direct config staging, since their
  preconditions have no config override in this reducer: `PKMNANCHOREDITSELF`
  (Ingrain's `STATUS3_ROOTED` — real Ingrain-then-Roar turns) and
  `PKMNSXPREVENTSFLINCHING` (Fake Out's `isFirstTurn !== 0` gate — this
  reducer hardcodes every initial battler's `isFirstTurn: 0` with no config
  field, but a real switch-in sets it to 2, so a genuine switch-then-attack
  sequence stages it). ISSUES #72 REACHABLE list trimmed to the remaining 44
  (55 − 11, arithmetic-checked against the list body's own unique count).
- **Next:** ISSUES #72 batch 3, starting from `STRINGID_PKMNHUNGONWITHX`
  (top of the ranked REACHABLE list, still needing a seed search or
  alternate deterministic staging for Focus Band's hang-on roll) —
  `PKMNPROTECTEDBY` (Sturdy vs. OHKO, same seed-search shape) and
  `PKMNREGAINEDHEALTH` (3-battler-role investigation) are next after that;
  then `STRINGID_PKMNLAIDCURSE` starts the plain-idiom tail. The
  `CANCELER_TORMENTED` engine-gap fix (separate step, not a messageLines
  fix). The 4 MANUAL settling experiments. #71 Slice D. typeref slice-2
  re-scope (#39).
- **Notes:** PAPERCUT: `BattleScriptPartyMemberInput`'s `moves` override
  field defaults `pp` to 0 per slot when `pp` is omitted (unlike
  `FactoryFullTurnBattlerConfig`'s own "16-per-nonzero-move" default for the
  two *active* battlers) — staged a bench Fake-Out holder with `moves:
  [FAKE_OUT,0,0,0]` and no `pp` override, got a silent fallback to
  MOVE_STRUGGLE instead of an error, cost ~10 min to notice via a raw event
  dump before finding the fix (`pp: [5,0,0,0]`). Worth a future step: either
  default bench-override PP the same way the active-battler path does, or
  throw when a nonzero move slot has zero PP, rather than silently
  Struggling.

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
  trimmed to the remaining 55.
  **[supervisor correction, ~16:50]** the worker's "pre-batch list had 67"
  recount was itself the miscount — `git show 49763783:ISSUES.md` enumerates
  exactly 66 unique ids, matching the triage doc; 66 − 11 = 55, and the
  post-batch list body already contained exactly 55 (verified unique-counted).
  Headings/intro corrected 56→55 in the same docs pass. Also recorded here:
  the typeref re-scope scout merged at `6848d2ca` (docs-only,
  §4.1 revised slices 2-8, shim-by-call-site-cluster shape; entry-889
  blockage resolved; slice 3 dispatched to the side lane ~16:40).
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
