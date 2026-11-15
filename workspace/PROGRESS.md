# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-11-15 — cry1 (ts lane worker): cries inside move-animation tasks (ISSUES #219 family 3, step 1)

- **State:** on master, committed (`28272f3f8` first cries + fixtures, `6bcc6705a` second cries / stops / restore + length model, docs after). Sound only: frame hashes identical (differential vs `029d0943b`, `--harness-from-head`: cry1-roar-jynx-player-on, cry1-hypervoice-jynx-player-on,
  cry1-howl-jynx-player-on 1823 captures each); census seeds 0..99 Scene ON: only `sound` / `soundDigest` move (9 seeds, 12 Roars = 48 rows), `eventsDigest` / `commands` / `soundAnim` identical, 0 errors.
- **Did:** `moveAnimSounds.ts` plays the cry tasks in Scene ON: Roar ROAR_1 at script frame 6 (ducks), ROAR_2 +11, restore ROAR_2 + D_R2; Howl HIGH_PITCH at 34, restore + D_HP; Hyper Voice ES at 5 (DuckNoRestore), stop at D_ES, EE +1, round-2 stop at +53 (species independent), ES2 +55, stop, EE2, restore at the earlier of
  EE2 + D_EE and first ES + 98 (scheduled from the first cry: it falls after the engine's presented animation). Lengths: `cryTaskLengths.ts`, D = min(cap, ceil(K t) + 1), t = native cry frames (`genCryNativeFrames.py` -> `cryNativeFrames.ts`), one K per mode (ES .94996 cap 26, EE .970325 cap 141, R2 .944111 cap 61, HP .919943 cap 51):
  zero residual on 41 / 41 / 32 / 35 ROM species, and 32 / 32 pre-registered held-out edge species exact. 6 step-mode ROM windows (`tools/audio/fixtures/cry1-*-on.json`) pin every effective row (`tests/cry1CryTasks.test.ts`, 23 tests); engine = ROM + lab drift (+13 / +13 / +1 Roar, +4 Howl, 0 / 0 Hyper Voice).
- **Rescore:** T1 `missing-cry-task` 371 -> 0 (ROAR 336, HYPER VOICE 27, HOWL 8 sites; `soundCensusDelta.py` now counts a site emitted when its window holds a cry-task cry); T2 (seed 2: two Roars, ROM 4 cry rows + duck / restore all matched, missing 0 / extra 0; seeds 165 / 499 / 830 / 1028 use none).
- **Gates:** typecheck 0; test:gate 362 files / 2,843; 29 importer / aud24x / aud25x / hie3 / cry1 files green; build / build:lib 0. Full `npm test` not run (the supervisor runs it).
- **Next:** the cry-task audio modes (ROAR / HIGH_PITCH / ECHO fall back to NORMAL; scout step 2); Howl +4 / Roar +13 lab drifts unexplained. Evidence: `.integration/evidence/cry1/`.

---

## 2026-11-15 — hie3 (ts lane worker): General_HeldItemEffect sound effects (ISSUES #220 step 3)

- **State:** on master, committed (`b8ad30f62` engine + test + 5 fixtures, docs after). Sound only: frame hashes identical (differential vs `5054340cf`: hie1-sitrus-on 1823, hie1-cheri-on 1823, hie2-sitrus-opp-on 1101, hie1-sitrus-off 823 captures);
  census seeds 0..99 Scene ON: only `sound` / `soundDigest` move (82 seeds), `eventsDigest` / `commands` / `soundAnim` identical, 0 errors.
- **Did:** `moveAnimSounds.ts`: Scene ON `HELD_ITEM_EFFECT` plays 152 / 152 / 152 / 228 / 102 (pan attacker -64 / 63) at script frames 8 / 40 / 72 / 104 / 176 (table has only the first op; the rest is the measured spacing
  after `waitforvisualfinish`); **script frame 0 = command start + minimumFrames - 214**, one rule (restart 15, continuation 9, cure berry -22). The cure berry's first SE (14 frames before the command) is emitted from the preceding
  32-frame `status` command's age (it lasts exactly its length; no carry state). Scene OFF: none. Step-mode ROM windows on 5 labs (`tools/audio/fixtures/hie3-*-on.json`): ROM first SE 754 / 754 / 766 / 772 / 737 minus the
  lab drift (9 / 9 / 17 / 17 / 20, hie2b's) = engine frame exactly, all five rows each (`tests/hie3HeldItemSounds.test.ts`, `docs/hie3-held-item-sounds.md`).
- **T2 rescore** (5 Scene ON seeds 2 / 165 / 499 / 830 / 1028, ROM re-driven, before = base `moveAnimSounds.ts` on the same ROM files): ROM-only 152 24 -> 0, 228 8 -> 0, 102 11 -> 3 (the 3 are seed 499's SE_SHINY, not held items); extra 0.
  The 8 events match with all five rows at one delta each (lab drift -18 .. -2, one +48 in seed 2).
- **Gates:** typecheck 0; test:gate 362 files / 2,843; 25 files importing moveAnimSounds / tickSounds + aud24x / aud25x 280 / 280; build / build:lib 0. Full `npm test` not run (the step says the supervisor runs it).
- **Next:** cries in animation tasks; the open #220 residuals (Cheri ages 1-11, Shell Bell / Leftovers +1, post-heal tail). Evidence: `.integration/evidence/hie3/`.

---

## 2026-11-15 — CAX31 daily run (supervisor, Opus 5.5): in progress

- **State:** master `5a42c61f5` (engine final unless noted); full suite **14,848 / 14,848** on `5054340cf` (after hie2b); final gates running on
  `5a42c61f5` (`.integration/validation/sv-20261115/final/`), soaks on `029d0943b` (`soaks/`); lbw1 (Lobby NPC evidence, side lane) running.
- **Did:** nightly replay (pinned `9d0fb2f01`) **44 / 44** + stages **69 / 69** (`docs/replay-ledger.md`); merged `lbr-f-residual2` (`15777da20`)
  after its gates on the merge (typecheck, test:gate 2,843, full 14,830 / 14,830, soak vanilla 0:20 20 / 20, winning 0:60 60 / 60); hie1 (below);
  lbrd's retire case moved to seed 2 (hie1 moved the deal). hie2 drew the held-item effect but fitted its age 0 to each lab's pre-segment drift
  (app ~9-20 frames ahead of the ROM before the window); hie2b replaced that with age 0 = command frames - 204 and proved every window at the
  lab's own offset (`docs/hie2-held-item-render.md`; typecheck 0, test:gate 2,843, 252 importer files, build / build:lib 0, OFF + icePunch
  differential 2,152 captures identical).
- **Also folded:** hie3 (held-item SEs, entry above), cry1 (cries in move tasks, entry above; Roar / Howl offsets rest on source rules + the drift-free
  Hyper Voice anchor).
- **Next:** wind-down gates; Lobby NPC wander step 2 if lbw1 says the cursor is exact.

---
