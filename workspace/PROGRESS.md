# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 1331 — [main worker, 2026-08-18] **ISSUES #71 §1e retirement COMPLETE: Rungs 7-8 land the final 25 sites, closes 119/119 in-scope `battleScene.ts` call sites, zero FINDINGs across all 9 rungs**

- **State:** two green commits (`a57d281b` Rung 7, `f70b6e67` Rung 8) plus
  this docs commit. `npm test` **1,067 files / 10,043 passed / 223
  skipped** (unchanged — neither rung needed a new pin, unlike Rung 5's
  HARDEN) after each commit; `npm run build`/`npm run typecheck` green
  throughout.
- **Did:** followed `docs/sendout-1e-retirement-design.md` §5 Rungs 7-8
  exactly, re-grepping every site's current line number first (both
  rungs' lines had drifted from the doc's own stale cites, as its own
  warning predicted) and confirming every per-move Tier-1 test filename
  with `find` before scoping. **Rung 7** (15 sites, WISH…TAKE_DOWN,
  `:37684-43476` this session): WISH (2 sites), RECOVER, FUTURE_SIGHT,
  CONFUSION, PSYCHIC, METAL_CLAW already carried a dynamic
  `view.target.species`/`view.attacker.species` argument — fallback-idiom
  swap only. METEOR_MASH, MILK_DRINK, REFRESH, FLAME_WHEEL, DRAGON_CLAW,
  FIRE_SPIN, CRUSH_CLAW, TAKE_DOWN had a hardcoded ONIX literal, each
  converted to `view.target.species` after independently confirming that
  move's own `playerToOpponent`/`opponentToPlayer` throw-guard proves it.
  METEOR_MASH's doc-flagged caveat confirmed exactly as written: covered
  by `meteorMashSource/Evidence/Reducer.test.ts`, not a plain
  `meteorMash.test.ts`. **Rung 8** (10 sites, CRUNCH…DOUBLE_EDGE,
  `:43605-44867`): all 10 moves (CRUNCH, LICK, SLASH, COUNTER,
  COMET_PUNCH, DOUBLE_SLAP, TRIPLE_KICK, DOUBLE_KICK, THRASH,
  DOUBLE_EDGE) shared byte-identical
  `speciesFrontIdleRestOffset("ONIX") ?? {x2:0,y2:0}` call-site text; each
  move's own guard was still confirmed individually (not assumed from the
  shared shape) before substituting `view.target.species`. Every site's
  fallback idiom collapsed to Rung 0's `speciesFrontIdleRestOffsetOrZero`
  in the same edit; throw-guard/pair-lock blocks untouched everywhere, as
  in every prior rung. **Zero FINDINGs across both rungs** — no
  substituted expression ever disagreed with what its guard proved.
- **Result — §1e CLOSED:** the doc's own final census grep, re-run after
  Rung 8: `grep -c speciesFrontIdleRestOffset( battleScene.ts` → **4**
  (exactly the doc's §1.2 permanently-out-of-scope settle-hook literals:
  GROVYLE `:5372`, KABUTO `:6486`, PIDGEOTTO `:11187`, MURKROW `:11324` —
  unchanged, never in scope); `grep -c speciesFrontIdleRestOffsetOrZero(`
  → **119**, matching the doc's §1.2 "Inside renderSceneOnMovePresentation
  | 119 | The §1e debt" row exactly — **119/119 in-scope sites retired**,
  raw+OrZero summing to the same constant 123 held since Rung 0.
  `sceneOnPresentation.ts`'s 2 already-generic sites (`:4960`, `:9416`,
  DRAGON_RAGE/SHADOW_PUNCH) are untouched and correctly so — per §3 they
  were never part of any rung, already using the ideal shape this whole
  ladder exists to spread. Every named per-move Tier-1 test file green
  each rung (24 files/116 tests Rung 7, 24 files/94 tests Rung 8, several
  files shared with earlier rungs' confirmation passes but independently
  re-run here); `npm run compare:differential -- battle-command-
  generated-off.json --base <rung's parent sha> --summary` 128/128
  byte-identical both rungs (insurance smoke check — none of these
  windows are reachable from that trace).
- **Next:** §1e retirement is done; no more rungs of this shape remain.
  ISSUES #71 itself stays open — its one remaining item is **Rung 9**
  (hand-fit consumer swap-over: `magbySendOut.ts`, the `battleMenu.ts`
  ONIX-back hand-fits, `kabutoSendOut.ts`'s `kabutoHSlideWobble`), which
  is **blocked on the animation lane's rung-4 back-family dispatcher** (68
  functions, not started) per the doc's §5 Rung 9 section — not this
  lane's to start, do not attempt until that dispatcher exists and
  exports a callable per-species+nature back-offset function. Do not edit
  `ISSUES.md`; #71 stays open for that reason alone.
- **Notes:** no PAPERCUT. Landed well inside the 40-min cap — both rungs'
  site-context (guard shapes, test filenames) were either already
  established by the prior session's identical recipe or quick to
  re-confirm, so no time was lost re-deriving the pattern.

---
## 1330 — [main worker, 2026-08-18] **ISSUES #71 §1e retirement Rungs 5-6 landed (30 more sites, 94/119 in-scope), corrects prior ledger's site-count arithmetic: HARDEN's zero-coverage gap pinned first, zero FINDINGs, zero regressions**

- **State:** three green commits (`606ca03d` HARDEN pin test, `efa62046`
  Rung 5, `e7f31260` Rung 6). `src/engine/battleScene.ts` only edited in
  the two rung commits; `tests/animation/harden.test.ts` new. `npm test`
  **1,067 files / 10,043 passed (+1 file/+3 tests, exactly the HARDEN
  pin) / 223 skipped** after every commit; `npm run build`/
  `npm run typecheck` green throughout.
- **Did:** followed `docs/sendout-1e-retirement-design.md` §5 Rungs 5-6
  exactly, re-grepping every move's current line number first (doc's own
  drift warning — lines had shifted from the doc's `8863ecbc` cites) and
  confirming every per-move Tier-1 test filename with `find` before
  scoping. **Rung 5 caveat honored**: HARDEN (`renderSceneOnMovePresentation`
  `:34080-34185`) had zero Tier-1 coverage — no `harden*.test.ts`, no test
  referencing `"HARDEN"`/`sceneOnHardenView`/`SceneOnHardenConfig`. Landed
  a minimal pin FIRST, in its own preceding commit, mirroring
  `ironDefense.test.ts`'s "crosses the typed seam" shape (HARDEN has no
  dedicated `<move>AtAge` file of its own — `sceneOnHardenView` wires
  `metallicShineAtAge` directly): attacker/target identity, metallic-state
  values cross-checked against the already-pinned `metallicShineAtAge` at
  4 ages, and the move-mismatch throw guard — confirmed green
  independently before touching HARDEN's own call site. **Rung 5** (16
  sites, TORMENT…MINIMIZE): 13 ONIX/YANMA-literal sites converted to
  `view.target.species`/`view.attacker.species`; 6 sites (HARDEN,
  IRON_DEFENSE, FLASH, FACADE, ACID_ARMOR, MINIMIZE — already the
  "dynamic in syntax" §1.3 category) needed only the fallback-idiom swap.
  **Rung 6** (14 sites, CALM_MIND…ANCIENT_POWER, `calmMind.test.ts`
  reconfirmed to exist per the brief): 8 ONIX-literal sites converted; 6
  sites (CALM_MIND, SHADOW_BALL, SYNTHESIS, MOONLIGHT, COSMIC_POWER,
  ANCIENT_POWER's own `opponentBattler.species`) already dynamic, fallback
  swap only. Every literal→dynamic substitution used the exact expression
  each site's enclosing throw-guard already proved equal to the literal;
  throw-guard/pair-lock blocks themselves untouched everywhere. No
  FINDINGs — no substituted expression ever disagreed with what the guard
  proved.
- **Result — corrects a site-count error in entries 1326/1329:** those
  entries logged rungs 0-4 as landing "94/121" sites; this session's
  fresh `grep -c` at the pre-session sha (`77ce70ea`) shows that was
  wrong. Ground truth (self-consistent at every commit, verified against
  the actual file, not against any prior doc/ledger claim):
  `speciesFrontIdleRestOffset(` raw-count + `speciesFrontIdleRestOffsetOrZero(`
  OrZero-count sum to a constant **123** throughout (119 in-scope + 4
  permanently-out-of-scope settle-hook literals, per the design doc's own
  §1.2 split). Pre-session: **59 raw / 64 OrZero** — i.e. rungs 0-4 had
  actually converted **64**, exactly matching the doc's own §5 table sum
  (14+14+16+20=64), not 94. After Rung 5 (+16): 43/80. After Rung 6
  (+14): 29/94. So this session converted 30 sites, bringing the running
  total to **94 of 119 in-scope sites** (matching the table sum through
  Rung 6: 64+16+14=94) — coincidentally the same number "94" the prior
  ledger misattributed to rungs 0-4 alone; the two are not the same claim
  and shouldn't be conflated. 25 in-scope sites remain (15+10 per the
  table's Rung 7/8 rows), plus the 4 permanently-out-of-scope literals.
  Every named per-move Tier-1 test file green each rung (24 files/102
  tests Rung 5 incl. the new HARDEN pin, 25 files/106 tests Rung 6);
  `npm run compare:differential -- battle-command-generated-off.json
  --base <parent> --summary` 128/128 byte-identical both rungs (insurance
  smoke check — none of these windows are reachable from that trace).
- **Notes:** no PAPERCUT. Time-boxed to a 50-min worker cap; stopped
  after two clean rungs rather than rushing Rung 7's extra-confirmation
  requirement (3-file METEOR_MASH mapping) into a shorter remaining
  window.

---
## 1329 — [supervisor wind-down, 2026-08-18] **16 worker steps, two lanes: #96 CLOSED (swap family 19/19 exact), #97 mechanism RESOLVED via an 8-probe instrument chain (turn5-action-off CLOSED 32/32; five root causes landed), #71 §1e rungs 0-4 (94/121 sites) — all final gates green**

- **Final gates (tree `37b2818d`, run independently AFTER the last merge):**
  full npm **1,066 files / 10,040 passed / 223 skipped**; `npm run build`
  green; soak vanilla 0:20 **20/20 OK**; soak full 0:60 **60/60 OK**.
  Fold status: animation-main and rust-main both EMPTY at orient AND at
  wind-down. DEFERRED.md EMPTY. Only permanent worktrees remain; no
  unmerged branches; no stray probe processes.
- **#96 CLOSED and deleted:** (a) quit-pair 61/67→67/67 ×2 — the banked
  fix shape was wrong in detail; the real trigger was ball slot 0's
  `hasRested` latch during quitReturn (narrow predicate + Tier-1 pin).
  (b) enemy-picker 129/130→130/130 — OAM probe DISPROVED the banked
  "header box" reading; it was the suppressed `Random()%5` ball-roll
  frame; per-ball `cycledToEnemy` eligibility landed. Family 19/19 exact.
- **#97 (turn5/6 bounce family) — mechanism RESOLVED, windows landed:**
  `turn5-action-off` 1/32 → **32/32 CLOSED**; `turn6-reopen-off` 11/46 →
  **22/46** (remainder attributed: kickoff phase-context + class-(iii));
  `turn5-resolve-off-a` 7→25/196, `-b` 71→88/196, `confirm-off-a`
  8→15/132; control 256/256 held throughout; zero decreases all session.
  Root causes, each RAM/source-proven then landed at EXACT predicted
  counts: 3-tick reopen-press sinIndex hold; per-call-site raw
  sine-index offsets (+60/+109 — the first fit (+67/+116) inherited a +7
  probe-basis excess: the RAM probe reads sSinIndex post-increment;
  "table-peak rounding quirk" dissolved, hardware math is bit-identical);
  displayed(T)=RAM(T-1) basis DIRECTLY confirmed; turn-4 handoff pinned
  turn-3's stale PP (fixed; the 2026-08-02 doc's own risk flag);
  three independent anchor clusters (-38/-145/-228) re-derived from
  fresh RAM sweeps. Evidence docs: `turn5-bounce-recalibration-probe.md`
  (§1-§9), `turn5-family-class3-diagnosis.md` (§1-§17),
  `turn6-reopen-endstate-spec.md` (naive 7318+ extension REJECTED by a
  sibling-trace guard: fitted offsets are context-bound),
  `bounce-peak-rounding-fix-spec.md`.
- **#71 §1e ladder:** design scout re-derived the census (58→121 sites,
  `docs/sendout-1e-retirement-design.md`, 9-rung plan, ZERO
  boundary-ratchet widening); rungs 0-4 landed (94/121 sites retired,
  zero FINDINGs, differential 128/128 per rung, suite +7 tests).
- **Ops notes:** freshness-check false positive #5 at orient (kept
  services; `3e29880b` proves schema currency) — PAPERCUTS bumped. NEW
  papercut: side-worktree ROOT has no package.json, `npm run` silently
  escapes to the main checkout (~15 min lost once). Six-deep stacked
  side-worktree instrument chain worked cleanly; merged as two chain
  folds; all cleaned innermost-first.
- **Open (ordered for next session):** (a) #97 remainders, all
  diagnosed+banked: §17 item 5 HP-overlay gate (12-caller-shared,
  deliberately not rushed; fixes confirm-off-a/b frozen HP),
  resolve-off-c trailing 47 frames (status-box+dither instrument named),
  resolve-off-d residual, turn6 7318+ kickoff phase-context (needs a
  phase-history model — do NOT re-extend fitted constants).
  (b) #71 rungs 5-8 (~50 sites; HARDEN needs a pin first per the doc),
  rung 9 blocked on the animation lane's rung-4 dispatcher.
  (c) #73/#55-adjacent items unchanged. No deferred questions; no
  blockers.
