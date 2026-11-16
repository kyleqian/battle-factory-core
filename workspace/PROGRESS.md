# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-11-16 — CAX31 daily run (supervisor, Opus 5.5): wind-down: Lobby NPCs walk like the ROM, cry-task samples, three move-sound slices

- **State:** master clean, no workers, no worktrees; no push. **No DEFERRED items.** Final tree `3564a9712`. ENGINE_BUILD `eb-c26961a07ff6b07b` -> **`eb-4f7e2a7803523e94`**
  (dist-lib of `3564a9712`; tell the website). Evidence `.integration/validation/sv-20261116/`.
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
  Supervisor fix `3564a9712`: `tests/audioProbeFixtures.test.ts` lists the aud242i / j fixtures (the full suite caught it; test:gate does not run it).
- **Gates:** run start on `ec10cf3bf`: 0:60 default / winning / winning-swap **60 / 60** each, varied-RNG winning carry 0 / 14 / 28 + winning-swap carry 0 **100 / 100** each.
  Wind-down soaks on `0483bcb9c` (final engine; later commits are sound data / player / tests only): vanilla 0:20 OFF **20 / 20**, ON **20 / 20**; 0:60 default / winning /
  winning-swap **60 / 60** each; varied-RNG four sweeps **100 / 100** each. Full suite on `9160c5839` (lbw3) **14,943 / 14,943**; on final `3564a9712` **15,015 / 15,015**;
  build / build:lib 0. play:random 10 min / scene `--lobby-new-challenge` on `70b923b38`: ON 36 battles / 16 swaps / 9 new challenges, OFF 51 / 14 / 18; **0 page /
  console errors / overlays**.
- **Next:** move-SE lifetimes (Blizzard 88 per-species resolver, Confuse Ray 47, Spark 32, Tri Attack 24, Dig turn-0 offsets); the T1 `unclassified` 11,093 gap (SEs outside
  move windows; classifier first); the second `Status_*` play +14; hear a task cry live; #221 leftovers (tile race, fat man in the way, unmeasured entry routes, retire-off
  text pacing 78 frames); #220 residuals; then aud246 (S11 close). Nightly replay at run start as usual.

---

## 2026-11-16 — aud242j (ts lane worker): move-animation SE lifetimes, slice 10 (ISSUES #219 family 1)

- **State:** on master, committed (`8908b011b` lifetimes, `4e31b7675` ROM windows, docs after). Sound only.
- **Did:** `AnimTask_ShakeMonInPlace`, `AnimMovementWaves`, Red Heart projectile / burst, `AnimTask_DigUpMovement` (FALSE), Silver Wind sparks (C cited in the extractor; `docs/aud242-move-anim-sounds.md` section 14).
  ROM windows (step mode): Struggle +7, Silver Wind +2 (both sides), Dig unleash 0; Attract C-derived only (same-gender lab does not animate it).
- **Counts:** L50 emitted / gated 704 / 130 -> 707 / 127; all moves resolved 906 / 206 -> 910 / 202. T1 (seeds 0..99 ON, arms `on-04b803f5f` / `on-4e31b7675`): exact 24,055 -> 24,175,
  missing-gated 690 -> 570, extra 0, unclassified 11,093 -> 11,093 (unchanged: pre-existing tooling gap, not 0). `commands` / `eventsDigest` identical 100 / 100; differential 303 / 303 (3 traces).
- **Gates:** typecheck 0; test:gate 362 files / 2,843; importer tests 28 files / 292; build / build:lib 0. Full `npm test` not run (supervisor).
- **Next:** Blizzard 88, Confuse Ray 47, Spark 32, Tri Attack 24; Dig turn-0 offsets (-6 / +23). Evidence `.integration/evidence/aud242j/`.

---

## 2026-11-16 — aud242i (ts lane worker): move-animation SE lifetimes, slice 9 (ISSUES #219 family 1)

- **State:** on master, committed (`9752b45a0` waitsound bound + Sludge Bomb, `04b803f5f` Faint Attack + clearmonbg overrun, docs after). Sound only.
- **Did:** `waitsound` as an SE-length bound resolved by the visual finish; Sludge Bomb hit-particle lifetime; attacker fade / invisible-signal lifetimes (Faint Attack); `Task_ClearMonBg`
  overruns VBlank by 2 frames (a lag in the walk). ROM windows (step mode, both sides): Sludge Bomb 19 / 19 rows +2, Faint Attack +3 (script-start offset, interval exact), Poison Tail +4 -> +2.
- **Counts:** L50 emitted / gated 697 / 137 -> 704 / 130; all moves resolved 899 / 213 -> 906 / 206. T1 (seeds 0..99 ON, fresh arms `on-d39e33b3c` / `on-04b803f5f`): exact 23,795 -> 24,055,
  missing-gated 950 -> 690, extra 0, unclassified 11,093 -> 11,093 (unchanged: pre-existing tooling gap, not 0). `commands` / `eventsDigest` identical 100 / 100; differential 240 / 240 (3 traces).
- **Gates:** typecheck 0; test:gate 362 files / 2,843; importer tests 27 files / 287; build / build:lib 0. Full `npm test` not run (supervisor).
- **Next:** Blizzard 88, Confuse Ray 47, Dig 37, Spark 32, Struggle 30, Attract 28 (`docs/aud242-move-anim-sounds.md` 13.4). Evidence `.integration/evidence/aud242i/`.

---
