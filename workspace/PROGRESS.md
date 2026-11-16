# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

## 2026-11-16 — cry2 (ts lane worker): the cry-task modes recorded and played (cry-task-scout step 2)

- **State:** on master, committed (`8bbc1cf5f` assets, player + Tier-1 after, docs / check tool last). Playback only; `src/engine`, frame hashes and the headless graph untouched.
- **Did:** recorded ROAR_1 / ROAR_2 / HIGH_PITCH / ECHO_START / ECHO_END with the existing recorder for the species that can use the move (Roar sets 37, Loudred, Exploud, + 7 Metronome / Assist / Mimic / Mirror Move users):
  **112 sounds on 46 species** in `cry-NNN-task.ogg` (+ AAC twins). Existing 566 files byte-identical. Cry Ogg +369,586 B (4.55 -> 4.92 MB), AAC +315,559 B; total Ogg 7.82 MB, AAC 7.69 MB.
  Player: `CRY_MODE_NAMES` maps all 8 modes, NORMAL only when the asset is missing (`stats.cryFallbacks`). `docs/cry1-cry-tasks.md` "cry2".
- **Gates:** typecheck 0; test:gate 362 files / 2,843; audio files (manifest, fallback, player, followups, frame identity, headless boundary, cry1, new `cry2CryTaskPlayer`) 98 / 98; build / build:lib 0.
  Browser `audioCheck.mjs --frames 7200` (122 s, `?audio=1`): 0 console errors, 0 missing / fallbacks, all 92 task files decode in Chromium (Ogg + AAC). The check's bgm count was stale since aud247 (fixed).
- **Next:** no task cry sounded in the browser run (seed 3 plays NORMAL / FAINT only): hear one live. The engine's cry-task lengths remain cry1's fit. Evidence `.integration/evidence/cry2/`.

---
