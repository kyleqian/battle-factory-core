# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-11-15 — CAX31 daily run (supervisor, Opus 5.5): wind-down: held-item effect drawn + timed + sounds, cries in move tasks, Lobby cursor fix

- **State:** master clean, no workers, no worktrees; no push. **No DEFERRED items.** Final engine `5a42c61f5` (after cry1), then lbr-g merged (`620b0607f`, #221 E1-E3) + the iss215 probe-import fix (`ff2d2afec`).
  ENGINE_BUILD `eb-93fedef9241b4242` -> **`eb-0c05d14e04bac704`** (dist-lib of `5a42c61f5`; after lbr-g **`eb-c26961a07ff6b07b`**, the build to ship; tell the website). Evidence `.integration/validation/sv-20261115/`.
- **Website (Mac):** Leftovers / berries / Shell Bell now play the ROM's held-item animation (Scene ON) and its pause (Scene OFF), so those
  battles run longer; the animation's three sounds play; Roar / Howl / Hyper Voice play their cries (the player still uses the NORMAL sample for the
  ROAR / HIGH_PITCH / ECHO modes). After a loss / forfeit / retire / 7-win the Lobby RNG cursor now follows the ROM up to the NPC wander, so an in-game new challenge deals a different (closer to the ROM) draft. No API change.
- **Gameplay (replay, item 0d):** nightly check on `9d0fb2f01`: pool **44 / 44** (1,780 states), staged battles **69 / 69** (`docs/replay-ledger.md`).
  No battle-rule change this run, so no wind-down permanent-list drive.
- **Folded:** `lbr-f-residual2` (saving -> saved +2 ticks; gates on the merge: full 14,830 / 14,830, soaks 20 / 20 + 60 / 60); hie1 (held-item command
  + OFF Pausex20 hold), hie2 + hie2b (Scene ON drawing; hie2's age-0 fit absorbed each lab's pre-segment drift, hie2b replaced it with one rule,
  age 0 = command frames - 204, every window exact at the lab's own offset), hie3 (SEs 152 / 228 / 102: ROM-only 24 / 8 / 11 -> 0 / 0 / 3 on 5 seeds),
  cry1 (T1 `missing-cry-task` 371 -> 0), lbw1 + lbw2 (Lobby NPC wander simulator matches the ROM on 6 traces; ISSUES #221 filed), lbr-g (#221 E1-E3: VBlank draws held until ReturnFromBattleToOverworld, Pokerus + save-block draws, Lobby map-load draws; offset 0 on 6 traces from the battle exit to entry + 33; re-pins lbrd WIN_TWO_SEED 2 -> 35, randomRoundSoak Baton Pass 12 -> 1 / vanilla swap-offer 0 -> 1 / winning chain 47 -> 13).
- **Gates (final engine `5a42c61f5`):** full suite **14,935 / 14,935**; build / build:lib 0 (typecheck by every worker + test:gate 2,843). Soaks
  (`029d0943b` = hie3 tree; cry1 is sound-events only): vanilla 0:20 OFF **20 / 20**, ON **20 / 20**; 0:60 default **60 / 60**, winning **60 / 60**;
  varied-RNG first-round winning carry 0 / 14 / 28 **100 / 100** each, winning-swap carry 0 **100 / 100**; on `5a42c61f5`: winning-swap 0:60
  **60 / 60**, vanilla 0:20 ON **20 / 20**. play:random 10 min / scene `--lobby-new-challenge` on `5a42c61f5`: ON 33 battles / 13 swaps / 8 new
  challenges, OFF 53 / 16 / 15; **0 page / console errors / overlays**. **lbr-g** (on its branch): typecheck 0, build / build:lib 0, test:gate 2,843, full suite 14,937 passed / 1 failed (iss215 tools ratchet, the lbw probes, fixed in `ff2d2afec`), soak vanilla 0:20 **20 / 20**; merged tree: lb* / ratchet / soak-pin tests 142 / 142, build:lib 0, soak winning 0:20 **20 / 20**. The 0:60 and varied-RNG gates did not re-run after lbr-g (next run).
- **Next:** Run start: the 0:60 / varied-RNG soaks on master (lbr-g landed after them). #221 E4 = the Lobby NPC wander port (lbw1 simulator is the test oracle; `docs/lbw1-lobby-wander-evidence.md`); cry-task
  audio modes (cry-task-scout step 2); #220 residuals (cure berry ages 1-11, +1 Shell Bell / Leftovers, post-heal tail ~18); the second
  `Status_*` play +14; move-body SE lifetimes (aud242 family); then aud246 (S11 close). Nightly replay at run start as usual.

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

