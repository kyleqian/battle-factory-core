# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 885 — [bounded MAIN worker, 2026-08-03] ISSUES #70 — STRINGID_PKMNHURTBY crash FIXED (wrap-family end-of-turn damage tick)

- **State:** master `58634980` (one commit on top of `37a4b621`). Full
  `npm test`: **645 files / 6,444 passed / 1 skipped** (+1 from this step's
  new test). `npm run build` green (tsc -b + vite).
- **Did:** fixed the highest-severity gap batch-2 surfaced last session:
  `BattleScript_WrapTurnDmg`'s own `printstring STRINGID_PKMNHURTBY`
  (`battle_message.c:148`, `{B_ATK_NAME_WITH_PREFIX} is hurt\nby
  {B_BUFF1}!`), fired every turn `ENDTURN_WRAP`'s recurring-damage branch
  runs (`battleEndTurnOrchestration.ts`'s `WRAP_TURN_DMG_LABEL`/
  `runWrapTick`) — reachable on the very first successful use of any of the
  6 trapping moves (Bind/Wrap/Fire Spin/Clamp/Whirlpool/Sand Tomb), since
  real Gen3 deals the trap's first damage tick the same turn it's set.
  `messageLines` (`battleResolutionPresentation.ts`) gained a dedicated
  branch reading the print-time action snapshot for
  `B_ATK_NAME_WITH_PREFIX`, not `lastMoveAttacker` — `BS_ATTACKER` is
  reassigned to the trapped battler itself for this tick
  (`enterTickBattlerContext`), which can differ from the battler that last
  used a real move. `prepareMessage`
  (`factoryBattleScriptFullTurnDecision.ts`) gained a `STRINGID_PKMNHURTBY`
  substitution resolving `{B_BUFF1}` via `resolveMoveName(rules.battlers
  [rules.selectorRoles.attacker].wrappedMove)` — the trapping move's own id,
  stamped onto the trapped battler by `applyWrapMoveEffect`
  (`battleScriptHitChainOpcode.ts:3722`) when the trap was first cast.
- **Tests:** `tests/presentationStringHurtBy.test.ts` — one staged real-Bind
  full-turn repro through the production kernel (the same turn's own
  end-of-turn tick fires the gap, so no synthetic-event fallback was
  needed), brute-forcing seeds for Bind's 75% accuracy roll. Red-verified
  once via `git stash` on the two touched engine files: threw
  `battleStringResolver`'s exact completeness-guard error
  (`STRINGID_PKMNHURTBY references placeholder {B_BUFF1} with no resolver
  supplied`) pre-fix; green post-fix, asserting `["Foe {opponent} is
  hurt", "by BIND!"]`. `npm run compare:differential -- battle-command-
  generated-off.json --base 37a4b621 --summary` (base = this commit's
  parent): **PASS — 128/128 captures byte-identical** — no standing capture
  reaches this string.
- **Next:** ISSUES #70's remaining 12 ids (ability-prevention family x5,
  Uproar family x3, `USINGITEMSTATOFPKMNROSE`, `PKMNSTOCKPILED`/`PKMNHPFULL`,
  `PKMNTRANSFORMEDINTO`) plus the `INTROSENDOUT` extractor gap. Full per-id
  detail and file:line citations already in ISSUES #70 — do not re-derive.
- **Notes:** `tests/executableFrontierRatchet.test.ts` green, untouched, no
  new recording imports, no barrier-count changes. Diff stays additive in
  `messageLines`/`prepareMessage`; no timing constants touched.
- **[supervisor final addendum, ~03:45]** hurtby fix verified (repro
  test green, differential 128/128 per worker + suite rerun below).
  animation-main fully folded (no new commits at final check). Preview
  serving final master `497c1bd4` on :5199. Final independent full-suite
  rerun by supervisor at `497c1bd4`: **exit 0, green** (03:33-03:37;
  pass-count lines clipped by the capture — the worker's same-commit run
  recorded 645 files / 6,444 passed / 1 skipped).
  Session total: 18 workers (12 main, 6
  side), 1 cap-kill salvaged, 0 lost steps. Tonight's #70 class work:
  35 of 47 sweep ids + PKMNHURTBY mapped and pinned; remainder = 12
  intricate ids + INTROSENDOUT extractor (documented in #70).

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
