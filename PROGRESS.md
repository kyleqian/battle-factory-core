# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 898 — [bounded MAIN worker, 2026-08-03 ~18:05] ISSUES #72 batch 3 (shortened, 45-min cap): 4 more REACHABLE printstring STRINGIDs landed

- **State:** master `4913d940`, on top of `897`'s commit (`efecd519`). Full
  `npm test` green (**668 files / 6,614 passed / 1 skipped**, 0 failures),
  `npm run build` green (`tsc -b && vite build`), `compare:differential --
  battle-command-generated-off.json --base efecd519 --summary`: **PASS —
  128/128 byte-identical**.
- **Did:** Shortened (45-min cap) continuation of ISSUES #72's ranked
  REACHABLE list, starting at `STRINGID_PKMNLAIDCURSE` per the supervisor
  brief (skipping the 3 documented hard cases again:
  `PKMNHUNGONWITHX`/`PKMNPROTECTEDBY`/`PKMNREGAINEDHEALTH`, still unlanded).
  Landed 4 via the Taunt-pair idiom (census: 85→81 UNRESOLVED, 35→39
  already-explicit, exact -4/+4 match): `STRINGID_PKMNCOPIEDSTATCHANGES`
  (Psych Up, plain move-attacker/defender pair), `STRINGID_PKMNSXBLOCKSY`
  (Soundproof vs. a sound move via `BattleScript_SoundproofProtected`'s own
  unreassigned move-target read), `STRINGID_PKMNSXMADEITINEFFECTIVE` (Yawn
  vs. Insomnia/Vital Spirit — `BattleScript_PrintBankAbilityMadeIneffective`'s
  own `copybyte sBATTLER, sBATTLER_WITH_ABILITY` fallthrough already writes
  `scriptingBattler`, so no new plumbing needed), `STRINGID_PKMNWASMADEDROWSY`
  (Yawn's own unconditional success tail). All 4 staged as full-turn
  production-kernel repros in one new file,
  `tests/presentationStringIssue72Batch3.test.ts`, red-verified via `git
  stash -- src/engine/battleResolutionPresentation.ts
  src/engine/factoryBattleScriptFullTurnDecision.ts` (exact completeness-
  guard error pre-fix, confirmed per-id). `STRINGID_PKMNLAIDCURSE` (Ghost
  Curse, Dusclops) was staged first — its `messageLines` shape (plain
  attacker/defender, no substitutions) is correct and was proven against the
  script trace, but a real full-turn repro hits an *unrelated* barrier:
  `runEndTurnTail`'s `ENDTURN_CURSE` case throws
  `BattleScript_CurseTurnDmg is not wired` (the per-turn Curse damage tick
  has no handler at all in this reducer's end-of-turn orchestration).
  Reverted rather than landed without a passing red-verified test; new
  tracked gap recorded in ISSUES #72, `STRINGID_PKMNLAIDCURSE` stays open and
  ranked first. `STRINGID_PKMNTRACED` (needs new `battleTextBuff1MonNick`
  nickname-resolution wiring in `prepareMessage`, not yet ported — deferred,
  not attempted) and `STRINGID_PKMNSXBLOCKSY2` (Perish Song vs. Soundproof,
  needs the same per-iteration `sBATTLER`/`addbyte` loop investigation
  `STRINGID_PKMNCUTSATTACKWITH`'s Intimidate loop already got — deferred, not
  attempted) were the next two candidates but the cap landed first. ISSUES
  #72 REACHABLE list trimmed to the remaining 40 (44 − 4, arithmetic-checked
  via `awk`+`grep -o 'STRINGID_[A-Z0-9]*'`+`sort -u`+`wc -l` against the list
  body's own unique count, excluding the one `STRINGID_X` placeholder token
  in the instructional parenthetical).
- **Next:** ISSUES #72 batch 4, starting from `STRINGID_PKMNHUNGONWITHX`/
  `PKMNPROTECTEDBY`/`PKMNREGAINEDHEALTH` if a dedicated seed-search/
  multi-context step is picked up, else `STRINGID_PKMNTRACED` or
  `STRINGID_PKMNSXBLOCKSY2` (both scoped above) or the next plain-idiom id
  after those (`STRINGID_PKMNFREEDFROM`). The new `ENDTURN_CURSE` end-of-turn
  gap (wire `BattleScript_CurseTurnDmg`, same shape as the existing Wrap/
  Reflect/Wish ticks) — a prerequisite for `STRINGID_PKMNLAIDCURSE`. The
  `CANCELER_TORMENTED` engine-gap fix (separate step, not a messageLines
  fix). The 4 MANUAL settling experiments (already DEAD-settled per 897 — no
  further action). #71 Slice D. typeref slice-2 re-scope (#39).
- **Notes:** Shortened step (45-min cap) — landed 4 of the targeted 6-8,
  prioritizing landing fewer ids fully over more partially, per the brief.
  No PAPERCUT this step (research-heavy but no tooling friction hit).

---
## 897 — [bounded MAIN worker, 2026-08-03 ~17:20] ISSUES #72 batch 2: 11 more REACHABLE printstring STRINGIDs landed via the Taunt-pair idiom

- **State:** master `86637733`, on top of `896`'s commit. Full `npm test`
  green (**667 files / 6,606 passed / 1 skipped**, 0 failures), `npm run
  build` green (`tsc -b && vite build`), `compare:differential --
  battle-command-generated-off.json --base 15891bab --summary`: **PASS —
  128/128 byte-identical**.
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
- **[supervisor merges, ~17:45]** three verified side branches folded on
  top of batch 2: typeref slice 3 (`53691c36` — idle-content shim + 8
  HP-overlay pin tests, census 80→80 as predicted, differential 797/797);
  #72 MANUAL settlement (`5c7d6e90` — all 4 settled DEAD; found the
  sub-110 draft-floor blind spot in hand-checked carrier citations, batch-1
  carriers reproduce 6/6 via the topology artifact; ISSUES #72 updated,
  partition now 66/41/0); terminal-seam scout (`19d7c3f9` —
  `docs/terminal-seam-round-flow-scout.md`: win/loss label sequences, the
  orchestrator's zero-presentation gap, increment (i) = second VM run at
  the win/loss labels with zero new WIN-branch opcodes — **recommended
  next-session headline**, feeds ROADMAP S8's round-flow remainder).
  Also corrected ISSUES #72's resurrected "67 ids" claim (was 66) and its
  stale "leaving 55" line (now 44).
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

