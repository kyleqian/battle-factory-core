# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
  t1cls (tooling only: the T1 census classifier attributes non-move SEs by command window, `unclassified` 11,093 -> 0, move family unchanged; finding: Status_Poison's 6th SE 148 lands 7 frames after the command, ISSUES #219). psn1 + sta2 (evidence only) and psn1 (ROM window: Status_Poison plays 6 SE 148, first + 70; docs/aud249 "psn1") + psn2 (the engine emits the 6th as a sound-only tail past the 71-frame window; differential 53 / 53 identical). Supervisor fix `3564a9712`: `tests/audioProbeFixtures.test.ts` lists the aud242i / j fixtures (the full suite caught it; test:gate does not run it).
- **Gates:** run start on `ec10cf3bf`: 0:60 default / winning / winning-swap **60 / 60** each, varied-RNG winning carry 0 / 14 / 28 + winning-swap carry 0 **100 / 100** each.
  Wind-down soaks on `0483bcb9c` (final engine; later commits are sound data / player / tests only): vanilla 0:20 OFF **20 / 20**, ON **20 / 20**; 0:60 default / winning /
  winning-swap **60 / 60** each; varied-RNG four sweeps **100 / 100** each. Full suite on `9160c5839` (lbw3) **14,943 / 14,943**; on `3564a9712` **15,015 / 15,015**; on final `36e9335ab` **15,016 / 15,016**, build / build:lib 0 (5 workers, 10 min);
  build / build:lib 0. play:random 10 min / scene `--lobby-new-challenge` on `70b923b38`: ON 36 battles / 16 swaps / 9 new challenges, OFF 51 / 14 / 18; **0 page /
  console errors / overlays**.
- **Next:** move-SE lifetimes (Blizzard 88 per-species resolver, Confuse Ray 47, Spark 32, Tri Attack 24, Dig turn-0 offsets); the second `Status_*` play +14 (sta2, docs/aud249 "sta2": not a script op; the message section between the plays is 14 frames short in Scene ON plus a 6-frame first-SE age offset; needs a per-frame `gBattlescriptCurrInstr` ROM window, then a frame-moving fix with the neutrality census); hear a task cry live; #221 leftovers (tile race, fat man in the way, unmeasured entry routes, retire-off
  text pacing 78 frames); #220 residuals; then aud246 (S11 close). Nightly replay at run start as usual.

---

## 2026-11-16 — t1cls (ts lane worker): T1 classifier attributes the non-move SEs

- **State:** on master, committed; tooling only (`lsd194Census.ts` `soundCmd` column, `soundCensusDelta.py --t1`, `soundCensusExpected.ts --nonmove`), nothing under `src/`.
- **Did:** the 11,093 `unclassified` were SEs / pans inside non-move commands (status animations, weather, held item, leech seed, focus punch, stats-change; Sun's 5,207 pans = its pan task). Attributed by command window, compared per command with the table.
- **Counts (seeds 0..99 ON, arms `on-4e31b7675` -> `on-bd46a5fbf`, same src):** move family exact / missing-gated / extra **24,175 / 570 / 0 unchanged**; unclassified 11,093 -> **0**; non-move 11,093 exact, extra 0, **missing 128** (Status_Poison plays 5 of 6 SE 148: ISSUES #219).
- **Gates:** `npm run test:smoke`; no test imports the tool. Command and table in `docs/aud243a-sound-census.md` "T1 classifier (t1cls)". Evidence `.integration/evidence/t1cls/`.
- **Next:** ROM window for Poison's 6th SE; then the move-SE lifetimes of the wind-down entry.

---

## 2026-11-16 — aud242j (ts lane worker): move-animation SE lifetimes, slice 10 (ISSUES #219 family 1)

- **State:** on master, committed (`8908b011b` lifetimes, `4e31b7675` ROM windows, docs after). Sound only.
- **Did:** `AnimTask_ShakeMonInPlace`, `AnimMovementWaves`, Red Heart projectile / burst, `AnimTask_DigUpMovement` (FALSE), Silver Wind sparks (C cited in the extractor; `docs/aud242-move-anim-sounds.md` section 14).
  ROM windows (step mode): Struggle +7, Silver Wind +2 (both sides), Dig unleash 0; Attract C-derived only (same-gender lab does not animate it).
- **Counts:** L50 emitted / gated 704 / 130 -> 707 / 127; all moves resolved 906 / 206 -> 910 / 202. T1 (seeds 0..99 ON, arms `on-04b803f5f` / `on-4e31b7675`): exact 24,055 -> 24,175,
  missing-gated 690 -> 570, extra 0, unclassified 11,093 -> 11,093 (unchanged: pre-existing tooling gap, not 0). `commands` / `eventsDigest` identical 100 / 100; differential 303 / 303 (3 traces).
- **Gates:** typecheck 0; test:gate 362 files / 2,843; importer tests 28 files / 292; build / build:lib 0. Full `npm test` not run (supervisor).
- **Next:** Blizzard 88, Confuse Ray 47, Spark 32, Tri Attack 24; Dig turn-0 offsets (-6 / +23). Evidence `.integration/evidence/aud242j/`.
