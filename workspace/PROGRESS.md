# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-11-17 — CAX31 daily run (supervisor, Opus 5.5, 2026-11-17 13:30 -> 2026-11-18 05:30 UTC): IN PROGRESS

- **State:** master `e0658f6f8`; workers: hpd4 (integration), adp1 (side). **No DEFERRED items.** Evidence `.integration/validation/sv-20261117/`.
- **Run start:** oracles current; baseline = last run's full suite (only tooling changed since `4e4c51880`). Disk 63 % -> 36 % (43 old census `tree/` dirs + `/tmp` scratch;
  list `.integration/evidence/TREES-PRUNED-20261117.txt`). No Mac fold (`mac/parity-mac` still `165548c4b`).
- **Gameplay (replay, item 0d):** nightly check on `e06cac9fc`: pool **44 / 44** (1,287 states), staged battles **72 / 72** (`docs/replay-ledger.md`).
- **Luck hunt day 1 (20261117):** 5,000 seeds, 6 marker hits, **6 ROM match, 0 differ**. luck2 promoted R032 R037 R038 R097 R107 R109; luck3 redesigned R030 (2 / 40 hits, promoted)
  and retired R039 / R067 / R095 (no practical design; reasons in `docs/parity-mac/rule-coverage.md`). Supervisor re-drove all 7 promotions: full ROM match. Rare rules **53 -> 60 / 110**;
  the hunter skips covered rules; 7 designs left for tomorrow (R035 R040 R080 R110 + ...).
- **Sound (S11), Scene ON T2 move-animation SE missing 63 -> 16 (sound-only, frames identical by differential + census 100 / 100):** aud257 Cosmic Power, Sweet Kiss; aud258 Seismic Toss
  (damage-level branch from the request's damage), Torment, Shock Wave (bolt task pans); aud259 Soft-Boiled, Block (the unidentified seed-165 window), Dynamic Punch, Fake Out, Crabhammer.
  aud260 Brick Break turn 2, Glare, Will-O-Wisp, Recycle, Air Cutter + a sound-only move-animation tail (SEs past the command window, the psn2 mechanism: Dynamic Punch, Signal Beam, Mud Shot).
  T1 0..99 ON missing-gated 41 -> 4 (Memento), missing-other 0. L50 table emitted / gated 807 / 51 -> 839 / 35. **First T1 census 0..999 since aud248 (aud260): Scene ON missing-gated 467,
  declined 5, other 1, extra 0, unclassified 0; Scene OFF 0 / 0.** aud261 (15 moves: Extreme Speed, Milk Drink, Pain Split, Flame Wheel, Swallow, Octazooka, Zap Cannon, Razor Wind,
  Covet, Needle Arm, Aromatherapy, Refresh, Smelling Salt, Gust, Spider Web; ROM windows both sides): **T1 0..999 ON missing-gated 467 -> 64**, extra 0; L50 862 / 12. Left: Magnitude 23,
  Rapid Spin 20, Water Spout 8, Memento 6, Present 4 (each needs a new variant dimension) + 3 singles. aud262 added the flag / elevation / HP-quarter / TOP variant dimensions
  (each keyed from the C, e.g. GetWaterSpoutPowerForAnim) + Luster Purge, Odor Sleuth, False Swipe, Pay Day: **T1 0..999 Scene ON move family missing-gated 0, extra 0, L50 table 878 / 0
  gated**; left: 5 declined rows (Rock Smash 2, Beat Up 2, Withdraw 1: no live adapter) and 398 T1 non-move "extras" (wsh1's three commands, unknown to the T1 rules; T2 matches them): aud263.
- **S11 acceptance table (aud263, `docs/aud251-s11-scoreboard-refresh.md` "aud263"):** T1 0..999 all families: Scene ON 388,855 exact, **missing 5 (declined), extra 0**, unclassified 0;
  Scene OFF 4,621 exact, 0 / 0 (the 398 rows now scored by the T1 rules). T2 41 ROM seeds: 0 missing / 0 extra both scenes. **Supervisor judgment (reversible):** the S11 gate is event
  parity; the constant per-window frame offsets (T2 3,683 of 3,991 ON move rows offset, p10 -20) are timing residuals (#198, ROADMAP item 6), not S11 blockers. Left for S11: adp1
  (Withdraw / Rock Smash / Beat Up have no live adapter at all: a 32-frame static placeholder in Scene ON), then the aud246 close (soaks, full suite, ROADMAP tick).
  aud260 committed twice to master by a stray `cd` (`f5c19e4e9`, `98bfa00d7`, before the wsh1 merge); same content as its branch, merge clean.
- **wsh1 (presentation, frames move by design):** WISH_HEAL / FUTURE_SIGHT_HIT / FOCUS_BAND now play as Scene ON commands (201 / 172 / 129 frames, ROM-measured) with their SEs,
  Scene OFF holds 36 / 42 / 40; census 0..99 both scenes `eventsDigest` identical (9 seeds gain the commands); vanilla 0:20 both scenes 20 / 20, winning 0:60 60 / 60 (supervisor);
  test:gate / build / build:lib 0; two soak frame pins re-pinned. wsh1b: doc `docs/wsh1-general-anim-commands.md`, Tier-1 pins for the semi-invulnerable / Substitute skips
  (already in the engine), Wish-on-Dig ROM window. **T2 ROM scoreboard: Scene ON 0 missing / 0 extra in every family (21 seeds; supervisor re-scored the 3 re-run seeds), Scene OFF
  0 / 0 (aud255, 20 seeds).** Future Sight +14 / +8 are the hpd HP-hold family (hpd3). wsh2 draws all three in Scene ON, both sides: in-window frames vs the ROM at the
  pre-segment offset Focus Band 131 / 131 + 130 / 130, Wish 200 / 202 + 201 / 202 (a star hand-over frame), Future Sight 172 / 172 + 173 / 173 (masked idle bounce); census both
  scenes identical incl. command lengths; phase anchors listed as fitted in `docs/wsh1-general-anim-commands.md` "wsh2".
- **Full suite on `276aff82b`** (3 workers, 20 min): 15,531 passed, 2 failed: `tests/lbrd.test.ts` (wsh1's Scene OFF holds moved the Lobby deal). Re-pinned by the supervisor
  (`f58f6bb02`: WIN_TWO_SEED 13 -> 19, the retire case keeps 13; scan 14..60 found no single seed for every case).
- **hpd3 (evidence, production unchanged):** the hpd2 in-turn constants are one ROM-verified source rule, the Scene ON script lead (script instructions after the "used" print run one
  per frame before `attackanimation`; receipts `tools/integration/fixtures/hpd3/`). Lead alone: rol1-rollout5-on 459 -> 873, hie1-sitrus-on 176 -> 718, 10 more windows up, hpd1-toss10-on down;
  not landed: some bodies' `live` already holds the lead, so hits / sounds would move. hpd4 does the per-body audit, then the lead, then the floor-free hold.
- **Crash check (item 5):** `play:random --minutes 10 --scene both --lobby-new-challenge` on `357cae402`: ON 41 battles / 15 swaps / 13 new challenges, OFF 72 / 24 / 24; **0 page /
  console errors, 0 overlays, 0 divergences**.
- **Next:** hpd4 (body audit + the script lead + the hold), adp1 (the three missing adapters), then the aud246 close.

---

## 2026-11-17 — CAX31 night run (supervisor, Opus 5.5, 2026-11-16 13:30 -> 05:30 UTC): wind-down: luck hunt, faster load, sound gaps, AI-switch withdraw, timing fixes

- **State:** master clean, no workers, no worktrees; no push. **No DEFERRED items.** Final engine tree `74e657c03` (ais3; later commits: t1dt tooling + docs).
  ENGINE_BUILD `eb-b17e87a4a52c33ad` -> **`eb-d0136314103d21fb`** (dist-lib of `74e657c03`; tell the website). Evidence `.integration/validation/sv-20261116b/`.
- **Website (Mac):** no API change (`challenge-request` / `start: "after-save"`, `ready` and input untouched); no new audio files. The library imports ~3x faster (lazy1: Node
  `import()` 2,480 -> 810 ms at equal load); the first-battle download is ~260 KiB smaller (dl2: sprite sheets as image rows; ~2,363 -> ~2,102 KiB brotli-11). The handoff's
  3.26 MB matches gzip-9: check that the CDN serves brotli. On screen: the opponent's mid-battle switch now prints "<TRAINER> withdrew <MON>!" and plays the recall (ais1-3);
  Leftovers / Shell Bell heals, the second confusion / sleep play and locked Rollout turns follow the ROM's timing (hie4, sta3, hpd2). Next options for size: `docs/dl1-download-size.md`.
- **Gameplay (replay, item 0d):** nightly check on `b5bb454a9`: pool **44 / 44** (1,366 states), staged battles **69 / 69** (`docs/replay-ledger.md`). No battle-rule change
  this run (sound, presentation timing, Lobby walking), so no wind-down permanent-list drive. Rare rules **53 / 110** (rrh4: R108, R105, R077 match the ROM).
  **Luck hunt (day job) is ready:** `tools/replay-hunt/luckHunt.sh` + 14 designs (luck1); first day 2026-11-17 05:45; read `luck-hunt/<day>/summary.json` at the next run start.
- **Sound (S11):** T2 ROM scoreboard: **Scene OFF 0 missing / 0 extra** (aud255, 20 seeds); Scene ON move-SE missing **63** on HEAD (aud256, 21 seeds; 1,679 on 2026-11-14), every other family 0 / 0, extra 0.
  T1 0..99 ON missing-gated 570 -> **41**, extra 0, unclassified 0 (aud242k-r, t1dt). Cry lengths source-derived for every species and mode (cry3 / cry4).
- **Folded (ledger detail in `docs/archive/PROGRESS-archive.md` and the step docs):** luck1, lazy1, dl1, dl2, aud242k-r, aud251-255, cry3, cry4, rrh4, lbw5, hie4, rol1, hpd1
  (evidence, rule reverted), hpd2 (locked-turn handoff 14), sta3, ais1-ais3, pin1, t1dt. Supervisor: typecheck flock (`package.json`), pin fixes after hie4 / sta3 / hpd2,
  disk cleanup (99 % -> 62 %: `/tmp` scratch and 32 old census `tree/` snapshots, list in `.integration/evidence/TREES-PRUNED-20261116.txt`).
- **Gates:** wind-down on `74e657c03` (final engine): vanilla 0:20 OFF **20 / 20**, ON **20 / 20**; 0:60 default / winning / winning-swap **60 / 60** each; varied-RNG winning
  carry 0 / 14 / 28 + winning-swap carry 0 **100 / 100** each. Full suite on `74e657c03` (2 workers, 58 min, beside the soaks): **15,384 passed, 0 failed**, one file
  (`tests/animation/signalBeamEvidenceCheckpoint.test.ts`) lost to a vitest worker exit under load, re-run alone 2 / 2 green (t1dt's suite on `4e4c51880`, same engine: 1,838 files /
  15,386 passed); build / build:lib 0. Mid-run full suite on `f52ab720a` found the two ais1 soak-pin moves (fixed by pin1). Log backup not run (`rclone` not installed).
- **Next:** S11: the Scene ON T2 rows, ranked by t2cls (`docs/aud251-s11-scoreboard-refresh.md` "t2cls"): emitters for the Wish heal / Future Sight hit / Focus Band general
  animations (16 rows), Cosmic Power (6), then Shock Wave (18), Seismic Toss (9), Torment (8) — the 63 of aud256 (Eruption was stale, eru1 / eru2); the T1 tail (Dynamic Punch, Memento ...),
  then census 0..999 both scenes for acceptance (aud246). Timing: the 18 in-turn frames of a Defense Curl + Rollout turn, then re-apply the floor-free hold `e01bfd249`
  (`docs/hpd1-hp-hold.md`). #222 / #221 residuals. Prune old census trees at run start (disk). Luck-hunt summary + nightly replay at run start as usual.

---
