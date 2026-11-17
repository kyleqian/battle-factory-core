# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-11-17 — CAX31 daily run (supervisor, Opus 5.5, 2026-11-17 13:30 -> 2026-11-18 05:30 UTC): IN PROGRESS

- **State:** master `299debeac` + docs; workers: wsh1 (integration), next aud258 (side). **No DEFERRED items.** Evidence `.integration/validation/sv-20261117/`.
- **Run start:** oracles current; baseline = last run's full suite (only tooling changed since `4e4c51880`). Disk 63 % -> 36 % (43 old census `tree/` dirs + `/tmp` scratch;
  list `.integration/evidence/TREES-PRUNED-20261117.txt`). No Mac fold (`mac/parity-mac` still `165548c4b`).
- **Gameplay (replay, item 0d):** nightly check on `e06cac9fc`: pool **44 / 44** (1,287 states), staged battles **72 / 72** (`docs/replay-ledger.md`).
- **Luck hunt day 1 (20261117):** 5,000 seeds, 6 marker hits, **6 ROM match, 0 differ**. luck2 promoted R032 R037 R038 R097 R107 R109 to `docs/parity-mac/stages/coverage/`
  (supervisor re-drove all 6: full match); rare rules **53 -> 59 / 110**; the hunter now skips covered rules. Open designs R067 / R039 / R095 cannot hit as built, R030 unexplained (luck3).
- **Sound (S11):** aud257: Cosmic Power + Sweet Kiss lifetimes ported; Scene ON T2 move-SE missing **63 -> 56**, engine-only 0; frames identical (differential 1,724 / 1,724, census
  100 / 100). Wish heal / Future Sight hit / Focus Band are not presented as commands at all (seed 3738 segment 894 vs ROM 1,119 frames): wsh1 adds them (hie1 pattern).
- **Next:** wsh1, aud258 (Shock Wave, Seismic Toss, Torment), luck3.

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
