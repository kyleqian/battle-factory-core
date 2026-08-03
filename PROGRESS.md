# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 886 — [bounded MAIN worker, 2026-08-03] ISSUES #70 batch 3 — final 12 presentation-string rows FIXED; #70 closed bar the extractor gap

- **State:** master `8489ca18` (one commit on top of `f36d7433`). Full
  `npm test`: **646 files / 6,456 passed / 1 skipped** (+12 from this step's
  new suite). `npm run build` green (tsc -b + vite).
- **Did:** mapped ISSUES #70's final 12 unranked ids (`docs/issue70-
  stringid-reachability.md`'s remaining rows), closing #70's string-mapping
  work entirely except the already-out-of-scope `STRINGID_INTROSENDOUT`
  extractor gap. Ability-prevention family (rows 6-10:
  `PKMNPREVENTSPOISONINGWITH`/`PKMNSXPREVENTSBURNS`/
  `PKMNPREVENTSPARALYSISWITH`/`PKMNSXPREVENTSYSZ`/`PKMNSXHADNOEFFECTONY`) —
  turned out simpler than the brief's own hypothesis once traced against
  real source: the direct-status-move trio is reached via
  `BattleScript_ImmunityProtected`/`WaterVeilPrevents`/`LimberProtected`'s
  own `copybyte gEffectBattler, gBattlerTarget` (already ported generically,
  `battleScriptIngrainLeechSeedWrapOpcode.ts:277-290`), while the other two
  are reachable **only** via Synchronize's own `seteffectprimary`
  re-application (`executeSynchronize`) — Poison Point/Static/Flame
  Body/Effect Spore's own contact-ability path calls `seteffectsecondary`
  (`primary=FALSE, certain=0`), which can never satisfy `preventionCall`'s
  `(primary||certain)` gate. Added a new, scoped `effectBattler`
  message-event field (`battleScriptEvents.ts`, mirroring batch 1's
  `scriptingBattler`) attached only to the 4 ids that read it — an
  unconditional first draft broke 2 pre-existing exact-equality tests
  (Trick's item-swap message, sleep-wake-up) by appearing on unrelated
  STRINGIDs that already had a non-null `selectorRoles.effectBattler`.
  Uproar family (rows 12-14: `PKMNCANTSLEEPINUPROAR2`/`UPROARKEPTPKMNAWAKE`/
  `PKMNSTAYEDAWAKEUSING`) — all three always name the sleep move's real
  target regardless of whose Uproar it is. `USINGITEMSTATOFPKMNROSE`
  (row 11) — `{B_BUFF1}`/`{B_BUFF2}` reuse `ATTACKERSSTATROSE`/
  `DEFENDERSSTATROSE`'s existing `lastStatChange` tracking; a real gap fix
  in `battleEndTurnOrchestration.ts`'s `STAT_UP_BERRIES` tick (never wired
  `scriptingBattler` to the berry holder, unlike every other end-turn
  held-item tick) supplied `{B_SCR_ACTIVE_NAME_WITH_PREFIX}`/`{B_LAST_ITEM}`.
  `PKMNSTOCKPILED`/`PKMNHPFULL` (rows 21-22) — Stockpile's counter was
  already tracked (`rulesContext.battleTextBuff1ByteNumber`), just not
  plumbed; Swallow-at-full-HP's `B_DEF_NAME_WITH_PREFIX` resolves via the
  attacker itself, matching its own self-target reassignment.
  `PKMNTRANSFORMEDINTO` (row 40, zero-incidence) — `{B_BUFF1}` reads the
  already-set `battleTextBuff1Species`. `FactoryFullTurnBattlerConfig`
  gained a `stockpileCounter` staging field (mirroring batch 2's
  `flashFireBoosted`) to stage Swallow-at-full-HP in one turn.
- **Tests:** `tests/presentationStringBatch3.test.ts`, 12 cases: 11 staged
  full-turn repros through the production kernel (including a genuine
  two-ability Synchronize interaction for rows 7-8: an Immunity/Poison-type
  attacker vs. a Synchronize-holding target using Toxic), 1 direct-resolver-
  branch case for row 40 (the doc's only explicitly zero-incidence id this
  batch). Red-verified once via `git stash` on the four touched engine
  files: 11 threw `battleStringResolver`'s exact completeness-guard error
  pre-fix; row 22 instead failed to even reach Swallow's full-HP branch
  pre-fix (the `stockpileCounter` field didn't exist yet).
  `npm run compare:differential -- battle-command-generated-off.json --base
  f36d7433 --summary` (base = this commit's parent): **PASS — 128/128
  byte-identical** — no standing capture reaches these strings.
- **Next:** the `STRINGID_INTROSENDOUT` extractor gap (`tools/extract/
  extract-battle-messages.ts`, ids 0/1/2/5 need a small hand-mapped table
  parsed from `BufferStringBattle`'s switch arms, same shape as
  `STRINGID_SWITCHINMON`'s own hand-port) — the only remaining piece of
  #70, owned by a separate step per ISSUES #71's own scoping note.
- **Notes:** `tests/executableFrontierRatchet.test.ts` untouched and green:
  no new recording imports, no barrier-count changes. Diff stays additive in
  `messageLines`/`prepareMessage`/`battleEndTurnOrchestration.ts`; no timing
  constants touched. PAPERCUT: `battleEndTurnOrchestration.ts`'s per-tick
  `scriptingBattler` wiring is set ad hoc per branch rather than once
  generically for every end-turn tick — the `STAT_UP_BERRIES` gap this step
  fixed is the kind of omission that pattern invites; a future pass could
  fold it into `runTickScript`/`enterTickBattlerContext` itself, ~10min cost
  avoided by not doing it now (out of this step's narrow scope).

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
  Newly filed 2026-08-03 (user request): **ISSUES #71** — main-lane share of
  send-out intro live wiring (dispatcher hookup + retiring the two
  `src/engine/` hand-fits); slots after #70/dossier-4/typeref unless the user
  reorders.
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
