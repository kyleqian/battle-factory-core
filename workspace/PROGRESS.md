# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
- **Sound (S11):** T2 ROM scoreboard (aud255, 41 seeds): **Scene OFF 0 missing / 0 extra**; Scene ON move-SE missing **76** (was 1,679 on 2026-11-14), all other families 0 / 0.
  T1 0..99 ON missing-gated 570 -> **41**, extra 0, unclassified 0 (aud242k-r, t1dt). Cry lengths source-derived for every species and mode (cry3 / cry4).
- **Folded (ledger detail in `docs/archive/PROGRESS-archive.md` and the step docs):** luck1, lazy1, dl1, dl2, aud242k-r, aud251-255, cry3, cry4, rrh4, lbw5, hie4, rol1, hpd1
  (evidence, rule reverted), hpd2 (locked-turn handoff 14), sta3, ais1-ais3, pin1, t1dt. Supervisor: typecheck flock (`package.json`), pin fixes after hie4 / sta3 / hpd2,
  disk cleanup (99 % -> 62 %: `/tmp` scratch and 32 old census `tree/` snapshots, list in `.integration/evidence/TREES-PRUNED-20261116.txt`).
- **Gates:** wind-down on `74e657c03` (final engine): vanilla 0:20 OFF **20 / 20**, ON **20 / 20**; 0:60 default / winning / winning-swap **60 / 60** each; varied-RNG winning
  carry 0 / 14 / 28 + winning-swap carry 0 **100 / 100** each. Full suite on `74e657c03` (2 workers, 58 min, beside the soaks): **15,384 passed, 0 failed**, one file
  (`tests/animation/signalBeamEvidenceCheckpoint.test.ts`) lost to a vitest worker exit under load, re-run alone 2 / 2 green (t1dt's suite on `4e4c51880`, same engine: 1,838 files /
  15,386 passed); build / build:lib 0. Mid-run full suite on `f52ab720a` found the two ais1 soak-pin moves (fixed by pin1). Log backup not run (`rclone` not installed).
- **Next:** S11: the Scene ON T2 top rows (Rock Throw 15, Thunderbolt 12, Absorb 8, ...; find each one's class), the T1 tail (Dynamic Punch, Soft-Boiled, Memento ...),
  then census 0..999 both scenes for acceptance (aud246). Timing: the 18 in-turn frames of a Defense Curl + Rollout turn, then re-apply the floor-free hold `e01bfd249`
  (`docs/hpd1-hp-hold.md`). #222 / #221 residuals. Prune old census trees at run start (disk). Luck-hunt summary + nightly replay at run start as usual.

---

## 2026-11-16 — CAX31 daily run (supervisor, Opus 5.5): wind-down: Lobby NPCs walk like the ROM, cry-task samples, three move-sound slices

- **State:** master clean, no workers, no worktrees; no push. **No DEFERRED items.** Final tree `36e9335ab` (psn2). ENGINE_BUILD `eb-c26961a07ff6b07b` -> **`eb-b17e87a4a52c33ad`**
  (dist-lib of `36e9335ab`; tell the website). Evidence `.integration/validation/sv-20261116/` (sv-20261113 deleted, last three runs kept). Log backup not run: `rclone` is not installed on this box.
- **Website (Mac):** no API change (`challenge-request` / `start: "after-save"` untouched). In the Lobby the woman now wanders and the fat man turns as in the ROM,
  the player is blocked by them, and both draw the shared RNG, so an in-game new challenge deals the ROM's draft. Roar / Howl / Hyper Voice cries play
  their own ROM samples: **112 new audio files** `cry-NNN-task.ogg` + AAC twins (+0.37 MB Ogg / +0.32 MB AAC) must be deployed with the audio `baseUrl`.
  More move-animation sounds play (Scene ON).
- **Gameplay (replay, item 0d):** nightly check on `ec10cf3bf`: pool **44 / 44** (1,575 states), staged battles **69 / 69** (`docs/replay-ledger.md`).
  No battle-rule change this run (Lobby RNG + sound only), so no wind-down permanent-list drive.
- **Folded:** lbw3 (#221 E4: `lobbyNpcs.ts` / `lobbyNpcDriver.ts`, cursor == ROM every frame on 6 traces, won-* windows 0 -> 54 / 54 etc.; re-pins lbrd WIN_TWO_SEED 35 -> 13,
  #89 Baton Pass soak seed 1 -> 0), lbw4 (player <-> NPC collision from live tiles, bump, depth sort; new trace `lbw4-woman-block-off` 501 / 501), cry2 (cry-task mode
  assets + player), aud242h / i / j (move-SE lifetimes: blend_color_cycle, Shadow Ball, vertical dip, waitsound bound, Sludge Bomb, Faint Attack, Task_ClearMonBg
  overrun, Struggle, Silver Wind, Dig, Attract; T1 census 0..99 ON missing-gated **1,066 -> 570**, extra 0; frames identical by differential each slice).
  t1cls (tooling only: the T1 census classifier attributes non-move SEs by command window, `unclassified` 11,093 -> 0, move family unchanged; finding: Status_Poison's 6th SE 148 lands 7 frames after the command, ISSUES #219). sta2 (evidence only, see Next) and psn1 (ROM window: Status_Poison plays 6 SE 148, first + 70; docs/aud249 "psn1") + psn2 (the engine emits the 6th as a sound-only tail past the 71-frame window; differential 53 / 53 identical). Supervisor fix `3564a9712`: `tests/audioProbeFixtures.test.ts` lists the aud242i / j fixtures (the full suite caught it; test:gate does not run it).
- **Gates:** run start on `ec10cf3bf`: 0:60 default / winning / winning-swap **60 / 60** each, varied-RNG winning carry 0 / 14 / 28 + winning-swap carry 0 **100 / 100** each.
  Wind-down soaks on `0483bcb9c` (final engine; later commits are sound data / player / tests only): vanilla 0:20 OFF **20 / 20**, ON **20 / 20**; 0:60 default / winning /
  winning-swap **60 / 60** each; varied-RNG four sweeps **100 / 100** each. Full suite on `9160c5839` (lbw3) **14,943 / 14,943**; on `3564a9712` **15,015 / 15,015**; on final `36e9335ab` **15,016 / 15,016**, build / build:lib 0 (5 workers, 10 min);
  build / build:lib 0. play:random 10 min / scene `--lobby-new-challenge` on `70b923b38`: ON 36 battles / 16 swaps / 9 new challenges, OFF 51 / 14 / 18; **0 page /
  console errors / overlays**.
- **Next:** move-SE lifetimes (Blizzard 88 per-species resolver, Confuse Ray 47, Spark 32, Tri Attack 24, Dig turn-0 offsets); the second `Status_*` play +14 (sta2, docs/aud249 "sta2": not a script op; the message section between the plays is 14 frames short in Scene ON plus a 6-frame first-SE age offset; needs a per-frame `gBattlescriptCurrInstr` ROM window, then a frame-moving fix with the neutrality census); hear a task cry live; #221 leftovers (tile race, fat man in the way, unmeasured entry routes, retire-off
  text pacing 78 frames); #220 residuals; then aud246 (S11 close). Nightly replay at run start as usual.

---

