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

## 775 — [BOUNDED MAIN WORKER 2026-07-31 ~05:05] #56 item 3 FIXED: gEnemyMonElevation extracted + applied; MAGNETON 424→703/751

- **State:** `npx tsc --noEmit` clean; focused suite 520/520 green (incl. new
  `enemyMonElevationsExtraction.test.ts`); ratchet unchanged (no new
  barriers, no new canonical-recording imports). `factory-arbitrary-intro-
  yoshi-off` **699/751 held** (hard requirement, COMBUSKEN elevation 0).
  `interactive-generated-intro-off` **715/715**, `battle-command-generated-
  off` **128/128**, both held. `factory-arbitrary-intro-magneton-off`
  **424/751 → 703/751**. Full `npm test`/`npm run build` not run this step
  (side worker live concurrently, per brief).
- **Did:** (1) Extracted `gEnemyMonElevation` (`battle_anim_mons.c`) into
  `src/data/gen/enemy-mon-elevations.json` (61 species, sparse — absent
  species are elevation 0 by construction) via
  `tools/extract/extract-enemy-mon-elevations.ts`, byte-for-byte pinned
  (`tests/enemyMonElevationsExtraction.test.ts`, also cross-checked equal to
  `battle-enemy-shadow.json`'s `elevatedSpecies` set — same source table).
  (2) Applied `origin.y = 8 + coords.yOffset - gEnemyMonElevation[species]`
  at `drawGeneratedOpponentRelease` (both the affine-blend and coeff===0
  branches) — no species-name branch, doc comment rewritten with the solved
  rule + evidence citation. (3) The SAME settled-opponent draw appears at two
  more sites reusing `fieldArt.opponent.origin.y` for the identical
  post-materialize/post-send-out battler position
  (`renderGeneratedBattleStartPlayerRelease`, `drawBattle2ActionMenuWindow`'s
  `fieldArt` branch) — both needed the identical subtraction or the fix
  would regress to wrong-Y once the intro handed off to the command menu;
  fixed both, plus wired the elevated-shadow draw (previously intro-only)
  into `drawBattle2ActionMenuWindow` too, since the shadow persists for the
  whole battle. `drawGeneratedOpponentShadow` refactored to take `fieldArt`
  directly (was the full `fieldView`) so both call sites could share it.
  `battle2ActionMenu`'s own ONIX/legacy fallback path is untouched (only the
  `fieldArt`-present branch changed; ONIX/MURKROW have no elevation entry,
  so the shared function is a no-op for every currently-pinned species).
- **Verified — shadow branch ruled (brief's explicit ask):** MAGNETON's
  shadow was **missing entirely** at the command-menu phase before this fix
  (`GENERATED_OPPONENT_SHADOW_DELAY`'s gate covered only the intro; the
  command-menu's `drawBattle2ActionMenuWindow` never drew a shadow at all).
  Fixed — MAGNETON's shadow now renders at both the intro and the settled
  command view.
- **Honest remainder (characterized, not chased — new divergence family
  post-fix, per the brief's stop rule):** MAGNETON now diverges only on 48
  frames (703/751), all in a periodic ~9-tick idle-menu-bounce pattern
  (alternating small bboxes around the player sprite `x41-102,y64-111` and
  opponent sprite `x127-229,y74-110`, frames 700-706/709-715/718-724/...).
  This is **not new**: the identical bbox/period pattern already exists,
  already-accepted, inside YOSHI's own committed 699/751 (visible at its own
  tail, e.g. frames 730-749) — confirmed pre-existing and species-
  independent, previously invisible for MAGNETON only because the tint bug
  swallowed the whole post-handoff window. No code changed for this; it's
  the same already-known residual family docs/trainer-pic-off-window-
  scout.md §D already covers, now also touching MAGNETON's own count.
- **Next:** #56 item 2 (frames 444/536) and the canonical +6 route term
  remain open, untouched (out of scope this step). #39 rank 3 is the
  ordered next main-lane item per entry 774.
- **Notes:** no papercuts. `docs/opponent-release-tint-third-species.md` and
  ISSUES #56 item 3 are stale (still describe this as unfixed) — trim owed
  in the next docs pass; not edited here per this step's scope (worker
  briefs don't edit ISSUES.md).

---
## 774 — [SUPERVISOR FINAL WIND-DOWN 2026-07-31 ~04:35] Round 11 verified: #39 rank 2 FULLY retired; MAGNETON tint rule SOLVED (gEnemyMonElevation). Session closed: 11 rounds / 22 workers / 0 failed steps

- **State:** master green at FINAL gate **559 files / 5688 tests + 1
  deliberate animation-lane skip**, production build clean, tree clean.
  `animation-main` fold delta **0** (orient and wind-down). Only the
  permanent `.worktrees/animation-main` remains; no orphan branches.
  **DEFERRED.md empty all session** — no open deferred questions.
- **Round 11 (verified):** M11 flipped the rank-2 Murkrow switch-in half
  (supervisor re-ran `turn13-switchin` **242/242** and
  `turn13-dragonbreath-faint` **141/141**; real
  `openpartyscreen`/`switchindataupdate` opcodes materialize MURKROW from
  DESTIN's probed bench through the 0-draw proven replacement) — **#39
  rank 2 is fully retired**, issue + inventory updated. S11 solved the
  MAGNETON materialize-tint rule with 4 species + source confirmation:
  `origin.y = 8 + yOffset − gEnemyMonElevation[species]`, where
  `gEnemyMonElevation` (`battle_anim_mons.c`) is a never-extracted
  per-species elevation table — #56 item 3 is now a bounded
  extract-and-apply step (probe fixtures committed).
- **Session totals (2026-07-30 22:10 → 07-31 04:35):** GATE 5 TICKED
  with its audited evidence chain (entry 772 has the full summary);
  #39 ranks 1 and 2 retired end-to-end via the equivalence-first
  two-phase pattern; #55/#56 filed with precise remainders; one
  worker-committed pin regression caught, quarantined, root-caused by
  discriminating probe, and properly un-quarantined; suite grew
  5586 → 5688 tests across 30+ commits.
- **Next session (ordered, per user's Gate 5 → #39 → Gate 6):**
  (i) #39 rank 3 (Turn-5 KO → switch-in → Sitrus) equivalence-first;
  (ii) #56: extract `gEnemyMonElevation` + apply the solved formula
  (expect MAGNETON ≫424/751, then rule on the elevated-shadow branch),
  frames 444/536, canonical +6 route term; (iii) ranks 4-9; (iv) Gate 6
  breadth.
- **Notes:** papercuts banked in PAPERCUTS.md; ledger-collision
  numbering instruction now proven in two consecutive briefs; no
  harness asks outstanding.

---
## 773 — [BOUNDED MAIN WORKER 2026-07-31 ~04:20] #39 rank-2 switch-in half RETIRED: stagePlayerHitChain terminal exposure + Murkrow switch-in flip

- **State:** all mandated pins hold: `turn13-switchin.json` **242/242**
  (hard), `turn13-dragonbreath-faint.json` **141/141**,
  `battle1-turn13-dense-a.json` **205/256** (pre-existing #23-parked
  exclusion, A/B baseline) / `-b.json` **223/223**,
  `turn13-sandattack.json` **190/190**, `interactive-generated-intro-off`
  **715/715**; rank-1 pins unaffected (`battle2-turn1-rockslide.json`
  191/191, `battle2-action-menu-dense.json` 209/209). `npx tsc --noEmit`
  clean; focused suite 443/443 green; ratchet unchanged (no new barriers).
  Full `npm test`/`npm run build` not run this step (side worker live
  concurrently, per brief).
- **Did:** (1) Exposed `stagePlayerHitChain`'s terminal
  `BattleScriptMachineState` additively
  (`stagePlayerHitChainToTerminalMachineState`,
  `turn1RockSlidePresentationStaging.ts`) plus two new optional inputs
  (`party`, `battleTopology`) — every pre-existing caller unaffected (same
  computation, empirically confirmed via unchanged pinned test outputs).
  (2) `turn13DragonBreathPresentationStaging.ts` DRY'd its staged input
  and added `stageTurn13DragonBreathHitChainToTerminalMachineState`,
  carrying DESTIN's real bench (`docs/onix-readylag-destin-bench-
  probes.md` Probe 2, `docs/battle-turn-notes.md` HEADLINE 3 for MURKROW's
  full stat block) and `BATTLE_TYPE_FACTORY`. (3)
  `turn13ResolutionAdapter.ts`'s new `resolveTurn13SwitchInAdapter` chains
  that terminal state through `runBattleScriptFaintedActionsOrchestration`
  — the real `openpartyscreen` opcode picks MURKROW via
  `getMostSuitableMonToSwitchInto` (already proven in
  `tests/destinCanonicalReplacements.test.ts`) and `switchindataupdate`
  rebuilds the incoming battler's real species/level/HP; result "resumed"
  (not terminal), MURKROW/slot 1/Lv50/142/142. (4) Flipped
  `battleScene.ts`'s `MURKROW_LEVEL`, `murkrowHealthboxContent`'s name/
  level/hpFraction, and `TURN13_SWITCHIN_SENTOUT_LINE2` onto this adapter
  (same promotion discipline as the two prior flips); left
  `murkrowHealthboxContentForHp`'s own per-tick HP-fraction literal (142,
  turns 14-16's ongoing tracking) alone — out of scope.
- **Next:** #39 rank 3 (Turn-5 KO → Pidgeotto switch-in → Sitrus) via the
  same proven equivalence-first two-phase pattern; the turn-14 dispatcher/
  slot-2 PP mirroring (`TURN13_TURN14_HANDOFF_NOT_STAGED`) stays a later
  step's own flip.
- **Notes:** ISSUES.md #39 rank-2 row can now read fully retired (both
  halves); `docs/battle-scene-retirement-inventory.md` rank-2 row's
  "Switch-in half still keyed" caveat is stale and should be dropped in
  the same trim. No papercuts this step.
