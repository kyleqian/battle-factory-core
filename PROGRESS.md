# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 966 — [supervisor WIND-DOWN, 2026-08-06] Session summary: 10 workers / 5 rounds — #78 switch route fully bound, #81 fight menu 52/57, same-day canary regression caught+fixed, #80 rank 2 + 34 walk-in sheets landed, rank-5 ground truth banked

- **State:** master at this entry's commit, clean. Final independent union
  verification: full `npm test` **754 files / 7128 passed / 1 skipped**
  (+44 tests today), `npm run build` green, `mid-battle-switch-dense-a-off`
  **95/95**, `battle-command-generated-off` canary **128/128**,
  `fight-menu-chrome-torment-off` **52/57** (5 measured residuals listed in
  ISSUES #81). `animation-main`: nothing to fold at orient or wind-down. No
  worker worktrees/branches left. DEFERRED.md: no open entries.
  Oracle-freshness FAIL at orient was again the documented docs-only false
  positive (only `_template`/NOTES harness commits since oracle start).
- **Did (10 workers: 5 main, 5 side; 2 cap-kills, both salvaged):** MAIN —
  (961) #78 ball-fade mechanism bind, field byte-exact incl. the 1-frame
  render lag; (962) torment settled frames byte-exact via 3 staging pins
  (two prior attributions falsified: "type cell"/"type text" were staging,
  "HP-cap" was staged HP); (963) class-4 bounce bind 11→52/57 + the
  phantom-fade source gate; (964) canary regression isolated — `0aeb2fde`
  introduced 82/128, `f0b52d7d`'s gate IS the whole fix, differential vs
  `a75c0f3a` clean; (965) #78 residuals 1a-1d all bound (doubled affine box
  + 2-tick OAM latch, emerge acc-58 + textured ball-blend + 1-tick lag,
  healthbox slide +1 tick, pure ball-open particle scheduler). SIDE —
  fight-menu chrome ground truth (arrow class falsified, singles have no
  target arrow); #80 rank 2 landed (ROM mon-icon sAnim_0 cadence +
  party-box bank-3 palette; frame-905 6810→4975px); §10 OAM ground truth
  for 1a-1d (probe twice-run byte-identical + 2 doc corrections); all 34
  tower walk-in sheets extracted+wired (0 px mismatches; LILIANA 903/903 +
  FISHERMAN 98/98 hold); #80 rank-5 status/held-item ground truth (fixture
  twice-run 251/251, PRZ template 156/156, level-text-suppressed-by-status
  finding).
- **Next (ordered):** (1) #78: extend the dense spec across the fade
  windows (measured remainder: 1188 27px emerge sliver, 1200 254px,
  1205-1207 staged-RATTATA class) and then the 1256-1407 fight-menu window;
  (2) #81's 5 residual frames (3 phase-boundary freeze-schedule frames —
  needs the shared battle-1 freeze constant question answered — + 2
  message-pacing); (3) #80 rank-5 bind per
  `docs/party-menu-status-item-ground-truth.md` §7, then rank 6; (4)
  RECORD/RETIRE binds per `docs/postwin-record-retire-ground-truth.md` §5;
  (5) lobby walkable + REST guard.
- **Notes:** two worker regression/attribution claims were disproven by
  supervisor cross-checks same-day (962's "pre-existing at baseline";
  963's "identical before/after gate") — verify such claims with per-frame
  sets and pixel samples before rebriefing on them. Salvage note: a draft
  1b boundary pin (frame-1104 particle count 15-vs-14) was dropped red at
  wind-down; re-derive from §10.2 with an oracle check if wanted. User
  directive mid-session: user reports are now written in Simplified
  Technical English (SUPERVISOR.md communication section updated).
  PAPERCUTS +2 (periodic-phase reconstruction tooling; diff-PNG legend).

## 965 — [bounded MAIN worker, 2026-08-06] #78 residuals 1a-1d bound: switch-out scale-up, send-in emerge, healthbox slide lag, ball-open particles — dense 95/95, command spec 128/128

- **State:** master `9a9c6563`, clean at commit. Typecheck green. Full
  `npm test` + `npm run build` NOT run (cap-killed at the docs gate);
  typecheck + `battle-command-generated-off` **128/128** +
  `mid-battle-switch-dense-a-off` **95/95** are the last verified tiers.
- **Did:** bound §10.5's four residual classes smallest-risk-first, one
  commit each: (1d `d8fd6b41`) healthbox slide keyed off elapsed 66-88 (the
  oracle renders the slide one tick later than the RAM: 110→0 over rendered
  1206-1228) — the 186-1379px healthbox band vanished, leaving only the
  particle + palette classes; (1a `07f632cb`) switch-out scale-up now uses
  the doubled 128px affine box + the `SetBattlerSpriteYOffsetFromYScale`
  feet-anchor y2 formula (var=64-2*13=38, `(var - floor(var<<8/scale))/2`),
  AND the rendered scale lags the §10.1 RAM table by **2 ticks** (the
  gOamMatrices write latches into the OAM matrix table two frames later —
  pixel-fit proved frame N renders §10.1's N-2 value; 813-988px → 46-78px,
  the mon scale-up itself byte-exact); (1c `2209e353`) emerge starts acc 58
  (not 76) + descends via the shared `MATERIALIZE_Y2_TABLE` (now exported)
  + textured OBJ-row ball-blend instead of the flat tint, rendered **1 tick
  behind** the §10.3 RAM table — 1189-1199 byte-exact (was 51-442px);
  (1b `9a9c6563`) recall (1089-1130, base (72,112)) + send-in (1187-1228,
  base (72,123)) ball-open particles via a pure scheduler
  (`midBattleSwitchParticleSchedulesAt`, age = frame-start-2-i, one-tick
  render lag) + the existing Sin/Cos + `sAnim_RegularBall` machinery —
  recall 1091-1099 and send-in 1195-1203 byte-exact.
- **Oracle:** `mid-battle-switch-dense-a-off` **95/95** (unchanged);
  `battle-command-generated-off` **128/128** (switch-route draws gated on
  `sourceDecision.kind === "switch"`, no leak into the GUST resolution).
  Remaining dense residuals (all measured): 1188 27px (emerge first-sliver),
  1200 254px, 1205-1207 25-48px (the pre-existing staged-RATTATA mon
  palette class, PROGRESS 957 side-asset) + 1203-1204 ~30px (particles tail
  + palette).
- **Next:** (1) extend the dense spec's `captureFrames` across 1091-1126 +
  1185-1227 (stage 5) — the committed spec stays 95/95; byte-exact is
  blocked only by the ~25-254px palette class; (2) the 1256-1407
  fight-menu window (out of scope for this step).
- **Notes:** three of the four classes needed a render-lag correction vs the
  doc's RAM tables (healthbox +1, particles +1, switch-out scale +2, emerge
  +1) — the probe reads the register/state the tick it's written, which
  renders one or two frames later; the §10 tables are the RAM state, not the
  rendered frame. PAPERCUT: the §10.2 particle z-order/draw-order and the
  scale-up pixel-fit each cost ~30-40 min of scratch-python forensics the
  doc's RAM-only tables couldn't answer (they had no per-frame rendered
  pixel ground truth).

## 964 — [bounded MAIN worker, 2026-08-06] ball-fade canary regression isolated + already-fixed: 0aeb2fde introduced 82/128, f0b52d7d's gate restores 128/128 — no source change needed, 962/963 corrected

- **State:** master `407635d0`, clean at commit. Typecheck green; smoke
  347/347. Full `npm test` + `npm run build` at session-end gate.
- **Did:** decisively isolated the `battle-command-generated-off` regression
  the supervisor brief attributed to 0aeb2fde — then proved the current tree
  already fixes it, so **no source edit was warranted** (supervisor's 15:10
  "matched-frame set identical before/after the gate" was itself wrong).
  Worktree receipts (app-vs-oracle, all fresh oracle replays): a75c0f3a
  (pre-0aeb2fde baseline) = **128/128**; 0aeb2fde = **82/128** with exactly
  the reported 2124px plateau bbox 42,59-100,111 (frames ~119-135, the
  non-switch GUST resolution's `fadeTick` landing in the recall window);
  27be9ea2 (0aeb2fde descendant) = 82/128, i.e. PROGRESS 962's "pre-existing
  at session-start baseline" claim only checked post-0aeb2fde commits —
  **WRONG**, corrected below. f0b52d7d (the `sourceDecision.kind === "switch"`
  gate) = **128/128**; HEAD = **128/128** and `compare:differential --base
  a75c0f3a` clean 128/128 byte-identical. Gate red-test: reverting JUST the
  gate line at HEAD reproduces the identical 82/128 (same 46 frames, 2124px),
  so the gate is the whole fix — no other leak in 0aeb2fde's touch set.
- **Oracle:** `battle-command-generated-off` **128/128**, differential vs
  a75c0f3a clean; `mid-battle-switch-dense-a-off` **95/95**;
  `fight-menu-chrome-torment-off` **52/57** (same documented 5: 736/766/977
  freeze-boundary + 1100/1200 message-pacing, ISSUES #81). Tier-1 gate pins
  (`tests/battleResolutionPresentation.test.ts` "midBattleSwitchFade gate",
  2) re-red-verified this session (both fail with the gate line stashed).
- **Next:** canary regression closed as already-fixed; per ROADMAP continue
  #80 ranks 2/5/6, RECORD/RETIRE, lobby walkable, 31 tower gfx.
- **Notes:** PAPERCUT: supervisor's 15:10 "identical before/after gate"
  evidence path was wrong (the gate demonstrably flips 82↔128 on the canary);
  the reliable recipe was worktree compare at the four lineage commits + a
  one-line gate revert at HEAD. 963's "re-verified 82/128" line is likewise
  corrected — f0b52d7d is 128/128.
