# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 884 — [bounded MAIN worker, 2026-08-03] ISSUES #70 batch 2 — 19 of 31 remaining presentation-string rows FIXED; 12 remain + 1 new gap found

- **State:** master `63dc4dc3` (two commits on top of `5ce289c8`). Full
  `npm test`: **644 files / 6,443 passed / 1 skipped** (+19 from this step's
  new suite). `npm run build` green (tsc -b + vite).
- **Did:** ported 19 of the 31 remaining ids from `docs/issue70-stringid-
  reachability.md`'s per-id table into `messageLines`
  (`battleResolutionPresentation.ts`), worked in the doc's own order:
  `PKMNFROZENBY`/`PKMNMADESLEEP` (extend batch-1's poisoned/burned/paralyzed
  ability-status branch), `PKMNRAISEDDEFALITTLE`/`PKMNRAISEDSPDEFALITTLE`
  (extend batch-1's Reflect/Light Screen/Safeguard branch),
  `PKMNSHROUDEDINMIST`, `PKMNCHOSEXASDESTINY`, the wrap family
  (`PKMNSQUEEZEDBYBIND`/`PKMNWRAPPEDBY`/`PKMNTRAPPEDINVORTEX`/`PKMNCLAMPED`/
  `PKMNTRAPPEDBYSANDTOMB`), the Leech Seed pair (`PKMNEVADEDATTACK`/
  `PKMNSEEDED`), the Trick item-swap family (`PKMNOBTAINEDX`/
  `PKMNOBTAINEDX2`/`PKMNOBTAINEDXYOBTAINEDZ` — `prepareMessage`'s own
  substitution already existed from a prior session), `PKMNUNAFFECTED`, and
  the Flash Fire pair (`PKMNRAISEDFIREPOWERWITH`/`PKMNSXMADEYINEFFECTIVE`,
  new `B_DEF_ABILITY` substitution). `FactoryFullTurnBattlerConfig` gained a
  `flashFireBoosted` staging field to reach the already-boosted
  re-activation string in one turn. Fixing `PKMNSXMADEYINEFFECTIVE` surfaced
  a real adjacent bug the full suite caught: `ABILITY_STICKY_HOLD` (60,
  reused by `BattleScript_StickyHoldActivates` for the same STRINGID) had no
  ability-display-name entry — added alongside Flash Fire's, second commit.
- **Tests:** `tests/presentationStringBatch2.test.ts`, 19 cases mirroring
  batch-1's shape: a staged full-turn repro through the production kernel for
  every id with a real non-zero-incidence trigger, and the direct
  resolver-branch idiom (synthetic event straight into
  `createBattleResolutionPresentation`, matching
  `tests/battleResolutionPresentation.test.ts`'s own `inputFor` pattern) for
  the 8 genuinely zero-incidence ids **plus the wrap family** — staging a
  real Bind/Wrap/Fire Spin/Clamp/Sand Tomb turn also fires that same turn's
  end-of-turn wrap-damage tick, which crashes on a *separate, previously-
  undiscovered* gap (`STRINGID_PKMNHURTBY`, not one of the original 47 —
  parsed from the real battle-script program, not a TS literal, so `#68`'s
  sweep never found it). Red-verified once via `git stash` on the two
  touched engine files: all 19 threw `battleStringResolver`'s completeness-
  guard error pre-fix. `compare:differential` (base `5ce289c8`,
  `turn5-rockslide`+`battle-command-generated-off`): **384/384
  byte-identical** — no standing capture reaches these strings.
- **Next:** ISSUES #70's remaining 12 ids (ability-prevention family x5,
  Uproar family x3, `USINGITEMSTATOFPKMNROSE`, `PKMNSTOCKPILED`/`PKMNHPFULL`,
  `PKMNTRANSFORMEDINTO`) plus the newly-found `STRINGID_PKMNHURTBY` gap
  (flagged **higher real-world severity** — any of the 6 common trapping
  moves crashes on its own first successful use) plus the `INTROSENDOUT`
  extractor gap. Full per-id detail and file:line citations already in
  ISSUES #70 — do not re-derive.
- **Notes:** `tests/executableFrontierRatchet.test.ts` green, untouched, no
  new recording imports, no barrier-count changes. Diff stays additive in
  `messageLines`/`prepareMessage`; no timing constants touched.

---
## 883 — [supervisor wind-down, 2026-08-03 ~02:30] species-dossier 6/7 + three same-night user-bug fixes + #70 batch-1; final union green

- **State:** master `70c58ae2` = final animation fold (front flip +
  ANIM_GLOW_BLUE + horizontal pivot families). Final union verified by
  supervisor: full `npm test` **6,424 passed / 1 skipped**, `npm run build`
  green. DEFERRED.md: no entries. Open backlog: **#70 batch-2** (31
  unranked ids + INTROSENDOUT extractor gap), **#39** (shrunk: dossier 6/7
  + typeref design banked), **#55** (parked). #56 settled, #62/#68/#69
  deleted-as-fixed this session.
- **Session (15 workers: 9 main + 6 side, 1 cap-kill salvaged, 0 lost):**
  dossier slices 1+2/3/5/6/7 presentation-neutral (slice 4 capstone
  DEFERRED to next session — §4 row 4); typeref retirement design banked
  (6-slice plan; 1+2 landable, 3/4b's dossier-7 gate now lifted); #62
  CLOSED (route divergence); #56 audit caught + same-night fixed the
  MAGNETON 703→702 stallLag regression, then SETTLED; live user play
  reports triaged→probed→fixed same-night: #68 TORMENT string (+ #70
  class discovered via its insurance sweep), #69 banner cadence
  (74.6→90.6 f/banner vs ROM 92; RNG exonerated 25/25); #70 batch-1
  (15 STRINGIDs + scriptingBattler event field + end-of-turn cure-name
  gap, 8 staged repro tests).
- **Next session (ordered):** (1) #70 batch-2 reachable-string mappings
  (docs/issue70-stringid-reachability.md rows below top-8); (2) dossier
  slice 4 capstone; (3) typeref slices 1-2 (dead-cut + P/Q fold), then
  3/4a/4b/5. All briefs re-derivable from the banked design docs.
- **Notes:** play-preview worktree (`.worktrees/play-preview`, port 5199)
  serving `70c58ae2` — INTENTIONAL, exclude from stale sweeps.
  `animation-main` remains a moving branch (live animation supervisor +
  nested worker `worker/animation-20260803-014242` at wind-down) — fold at
  next orient. Ledger-race rule adopted after one bite: never stage
  ISSUES.md/PROGRESS.md in the main tree while a main-lane worker is live.
  One app-differential temp worktree may linger under /var/folders —
  `git worktree prune` at next orient if present.

---
## 882 — [bounded MAIN worker, 2026-08-03] ISSUES #70 batch 1 — ranked top-8 presentation-string rows (15 STRINGIDs) FIXED

- **State:** master `fba78340` (one commit on top of `5b2cddf4`). Full
  `npm test`: **635 files / 6,390 passed / 1 skipped** (+8 from this step's
  new suite). `npm run build` green (tsc -b + vite).
- **Did:** ported the ranked top-8 rows of `docs/issue70-stringid-
  reachability.md`'s crash-risk table (15 `STRINGID_*` ids) into
  `messageLines` (`battleResolutionPresentation.ts`), mirroring #65/#68's
  resolver shape: `PKMNENERGYDRAINED`, `PKMNPROTECTEDITSELF`,
  `PKMNAVOIDEDATTACK`, `AVOIDEDDAMAGE`, `PKMNMAKESGROUNDMISS`,
  `PKMNPOISONEDBY`, `PKMNBURNEDBY`, `PKMNWASPARALYZEDBY`,
  `PKMNSITEMCUREDPROBLEM`, `PKMNENDUREDHIT`, `SUBSTITUTEDAMAGED`,
  `PKMNRAISEDDEF`, `PKMNRAISEDSPDEF`, `PKMNCOVEREDBYVEIL`, `HITXTIMES`.
  Three of these needed real data plumbing beyond a messageLines branch,
  added to `prepareMessage` (`factoryBattleScriptFullTurnDecision.ts`): (1) a
  new `scriptingBattler` field on the message event (source
  `gBattleScripting.battler` at print time), letting `B_SCR_ACTIVE_
  NAME_WITH_PREFIX` resolve generically for the on-contact-ability status
  ids; (2) ability-id→display-name substitutions for `B_DEF_ABILITY`
  (Wonder Guard/Levitate) and `B_SCR_ACTIVE_ABILITY` (Static/Poison
  Point/Flame Body/Effect Spore); (3) `rulesContext.multiHitStringCounter`
  surfaced as `HITXTIMES`'s `{B_BUFF1}`. Also closed a real reducer gap:
  `battleEndTurnOrchestration.ts`'s end-of-turn `HOLD_EFFECT_CURE_STATUS`/
  `CURE_ATTRACT` branches never captured `battleTextBuff1Status` before
  clearing the status bits (only the mid-battle post-hit sibling in
  `battleScriptMoveEndOpcode.ts` did), which would have left
  `PKMNSITEMCUREDPROBLEM`'s `{B_BUFF1}` unresolved for the more common
  end-of-turn Lum Berry/Mental Herb cure trigger.
- **Tests:** `tests/presentationStringBatch1.test.ts`, 8 scenarios (one per
  ranked row) through the production kernel (`createFactoryFullTurnBattleState`
  / `submitFactoryFullTurnDecision`) + `createBattleResolutionPresentation`,
  using the constrained-AI staging idiom and a small seed-search helper for
  the RNG-gated triggers (accuracy rolls, 30%-chance contact abilities).
  Red-verified once via `git stash` on the six touched engine files: every
  scenario threw battleStringResolver's exact completeness-guard error
  pre-fix; all 8 green post-fix, asserting the resolved banner text against
  the source-cited templates. `STRINGID_PKMNAVOIDEDATTACK` (part of ranked
  row 2) is mapped but not independently repro'd — its own trigger
  (`isDoubleAvoided`, `battleScriptHitChainOpcode.ts:1212-1213`) is
  `BATTLE_TYPE_DOUBLE`-gated, structurally unreachable in this engine's
  singles-only scope, matching the reachability doc's own row-31 note.
  The new `scriptingBattler` message-event field is exposed unconditionally
  (mirroring `actionSnapshot`), which surfaced 2 pre-existing exact-payload
  assertions (`tests/factoryBattleScriptWakeUpFullTurn.test.ts`,
  `tests/battleScriptTryswapitemsOpcode.test.ts`) — updated both to include
  the new (real, correct) field rather than narrowing the field's exposure.
- **Verified:** `npm run test:smoke` green mid-step (339/339, including
  `abilityItemParityCensus` after adding the new `ABILITY_DISPLAY_NAME_BY_ID`
  constant to that census tool's `ENGINE_INFRA_SPELLINGS` allowlist — a
  table name, not an ability member, same class as the pre-existing
  `ABILITY_NAME_BY_ID` entry). `npm run compare:differential -- turn5-
  rockslide.json battle-command-generated-off.json --base 5b2cddf4
  --summary` (post-commit, base = this commit's parent): **PASS — 384/384
  captures byte-identical across both traces** — neither standing window
  triggers any of the 15 fixed strings, exactly as expected.
- **Next:** ISSUES #70 batch 2 — the 31 remaining unranked ids + the
  `STRINGID_INTROSENDOUT` extractor gap (both scoped in the trimmed #70
  entry). Species-dossier slice 4 (capstone `renderSceneOffTurnView`
  convergence) is still the last ROADMAP slice.
- **Notes:** `tests/executableFrontierRatchet.test.ts` green, untouched, no
  new recording imports, no barrier-count changes. Diff stays additive in
  `messageLines`/`prepareMessage`; no timing constants touched (kept clear
  of #69's STAT_TIMING/MESSAGE_TIMING surface per the brief).

