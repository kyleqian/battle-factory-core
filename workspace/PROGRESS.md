# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-11-18 — CAX31 daily run (supervisor, Opus 5.5, 2026-11-18 13:30 -> 2026-11-19 05:30 UTC): IN PROGRESS

- **State:** in progress; interim entry (rewritten at wind-down). Workers live: liv2 (integration, long `live` windows), dl4 (side, per-move animation assets), ctl1 (ts, controller SE offsets).
- **Run start:** luck hunt day 3: R035 ROM match (seed 1040873, 14 / 14) promoted. Nightly replay on `8516a6da1`: pool **44 / 44** (1,427 states), staged **83 / 83** (`docs/replay-ledger.md`).
- **Folded (each: census 0..99 both scenes eventsDigest identical, by the worker):** pau2 / pau3 (`docs/pau1-script-pauses.md`: pause LONG before KOFail / AlreadyPoisoned, SafeguardEnds pause + 10-frame lead;
  HJK miss / Rest-under-Uproar already ROM-exact), mem2 (aud242 s30: 0x7FFF instant HP drop), kno3 (Knock Off item animation both scenes), hpd8 (Scene ON script lead + tail on 16 shape-A
  bodies; Aerial Ace 276 -> 771 / 1023, Thunderbolt 5 -> 352), ais4 (faint-replacement send-in on the AI timeline; obr251 OFF 6 -> 91, ON 6 -> 178 / 306; aud253 2741 SE / cry exact),
  lbw7 / lbw8 (Lobby: lbra-forfeit / lbra-retire / retire-freeroam and all 8 lbrb-* traces ROM-exact), dl3 (pictures per species: first-battle download ~2,112 -> ~1,700 KiB brotli-11; additive
  `FactoryGameOptions.spriteBase`), luck5 (7 Metronome luck designs; R073 promoted: rare rules **61 -> 63 / 110**), cln8 (129 unread fixtures untracked), t2r (T2 ON 25 seeds 0 missing / 0 extra;
  offset mass -15 %; top causes in `docs/aud251-s11-scoreboard-refresh.md` "t2r").
- **Gates so far:** full suite `2124ec8f0` 15,937 / 0; `f047ca4f5` 15,963 / 0; `2a4fef0b1` 15,970 / 0; `e166a1ace` **15,988 / 0**; build 0. Supervisor re-pinned randomRoundSoak after the ais4 fold (`80c7d08f3`).
- **Next:** fold liv2 / dl4 / ctl1; sta5 (first Status_* play, `.integration/briefs/sta5.txt`); Leech Seed body (-29 constant, t2r #5); wind-down soaks (src changed) + nightly-style replay of the permanent list (no battle-rule change so far: not required).

---

## 2026-11-18 — CAX31 daily run (supervisor, Opus 5.5, 2026-11-17 13:30 -> 2026-11-18 05:30 UTC): wind-down: S11 sound event parity met, script lead, three new animations, Lobby

- **State:** master clean, no workers, no worktrees; no push. **No DEFERRED items.** Final engine tree `a7cf4dfdb` (src unchanged since; later commits are tests / docs / luck designs).
  ENGINE_BUILD `eb-d0136314103d21fb` -> **`eb-f174716c006360f8`** (dist-lib of `6909b8d6c`; tell the website). Evidence `.integration/validation/sv-20261117/`; step ledger in the archive.
- **Website (Mac):** no API change (`challenge-request` / `start: "after-save"`, `ready`, input untouched); no new audio files. On screen (Scene ON): Wish's heal, Future Sight's hit, Focus Band,
  Withdraw, Rock Smash and Beat Up now animate with their sounds (they were static); Scene OFF pauses for the first three as in the ROM; HP-bar holds and move starts follow the ROM on six moves
  (Sonic Boom, Dragon Rage, Defense Curl, Rollout, Ice Ball, Seismic Toss); in the Lobby a held direction change mid-step goes straight.
- **Sound (S11): event parity met** (aud257-aud263, wsh1, adp1; `docs/aud251-s11-scoreboard-refresh.md` "aud263"): T1 census 0..999 both scenes, every family, **0 missing / 0 extra / 0
  unclassified** (ON move-SE gated 467 -> 0 this run, L50 table 807 / 51 -> 878 / 0 gated); T2 ROM replays 41 seeds 0 / 0 (ON move-SE missing 63 -> 0). **Supervisor judgment (reversible):**
  the S11 gate is event parity; constant per-window frame offsets (T2 ON move rows p10 -21 / median -2 / p90 +5) are item 6 timing residuals (ISSUES #219). ROADMAP S11 ticked.
- **Presentation timing:** hpd3 found the ROM-verified Scene ON script lead; hpd4 / hpd5 landed it on six audited bodies + the floor-free post-hit hold (`docs/hpd1-hp-hold.md`): hpd1 windows ON
  dragonrage 183 -> 950 / 1023, sonicboom 151 -> 938, toss30 174 -> 865, toss50 149 -> 927; Rollout / Ice Ball sound drift 9..63 -> within 3. hpd6 re-pinned 14 self-consistency / drift pins the
  suite caught (ais2's window keeps its ROM md5s, shifted +7 / +14). ice1: the Ice Ball lab damage gap was harness dice (two staged ROM drives 10 / 10).
- **Gameplay (replay, item 0d):** nightly check on `e06cac9fc`: pool **44 / 44**, staged **72 / 72**. No battle-rule change this run (census `eventsDigest` identical every step), so no wind-down
  permanent-list drive. Luck hunt day 1: 6 / 6 ROM match; luck2-4 + ice1: rare rules **53 -> 61 / 110** (+2 Rollout / Ice Ball stages); the hunter skips covered rules; open designs R035 / R040 / R110.
- **Lobby (#221):** lbw6 (`lbw6-*-off` 156 / 156, 183 / 183, 128 / 128; five pose residuals fixed; every Lobby trace equal or better).
- **Gates (final engine `a7cf4dfdb`):** vanilla 0:20 OFF **20 / 20**, ON **20 / 20**; 0:60 default / winning / winning-swap **60 / 60** each; varied-RNG winning carry 0 / 14 / 28 + winning-swap
  carry 0 **100 / 100** each. Full suite on `6909b8d6c` (4 workers): **15,935 passed, 0 failed**; build / build:lib 0. `play:random --minutes 10 --scene both --lobby-new-challenge` on `6909b8d6c`: ON 36 battles / 16 swaps, OFF 69 / 22; **0 page / console errors, 0 overlays**. (A first full suite on `a7cf4dfdb` had 14 failures in 9
  files from hpd4 / hpd5: fixed test-side by hpd6; a revert of hpd4 / hpd5 was prepared as fallback and not needed.) Log backup not run (`rclone` not installed).
- **Next:** (1) sound frame alignment, re-ranked by t2off (`docs/aud251-s11-scoreboard-refresh.md` "t2off"): the script lead does NOT move body SEs (the tables use the pre-lead
  clock), but the SEs of the NEXT command do move: out1 / psn3 found the three biggest windows' causes (Knock Off's item animation not presented, Flamethrower's body 115 vs 215 rows,
  Horn Drill's miss pause B_WAIT_TIME_LONG not accepted: ~10 % of the offset mass; pau1 lists every dropped script pause; ISSUES #219), and the Poison-tick -22 is inherited body drift; then Bubble Beam / Fire Blast / Magical Leaf. (2) Presentation fixes measured at wind-down (docs only, not landed; ISSUES #219): the 0x7FFF instant
  HP drop drawn as a 106-row drain (Memento, Explosion, Self-Destruct: ~100 frames each; mem1 / exp1), the `Cmd_end` song-wait tails (Self-Destruct 113 -> 122, Solar Beam idle 39 + live 199:
  sdx1), the short `live` windows (liv1), the script lead on the hpd7 rows (take the lead from the kernel's instruction counter), the first Status_* play (sta4). Each moves frames:
  census eventsDigest identity + soaks + `randomRoundSoak` / `lbrd` re-pins (their pin notes) + the FULL suite (test:gate missed 14 pins this run). (3) #221 Lobby leftovers, #222.
  Luck-hunt summary + nightly replay at run start; prune census trees.

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
