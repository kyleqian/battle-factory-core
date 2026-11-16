# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-11-16 — aud252 (ts lane worker): S11 controller sound gaps (SE_EFFECTIVE pans of end-turn weather, loss-path SE_BALL_OPEN), sound only

- **State:** on master, committed. Sound-only (`battleHitSounds.ts`, `battleEndSounds.ts`, `tickSounds.ts`); doc section "aud252" in `docs/aud251-s11-scoreboard-refresh.md`; evidence `.integration/evidence/aud252/`.
- **Did:** (1) end-turn weather damage SE_EFFECTIVE pans by `gBattlerTarget` (always the player, -64; `tests/aud252EndTurnSounds.test.ts`, ROM Hail fixture `aud252-hail-damage-player.json`). (2) the loss's SE_BALL_OPEN
  now follows the ball-return command (22 ticks after its first tick) instead of the faint dismissal + 24, so it comes after an opponent held-item effect as in the ROM (`tests/aud252LossBallOpen.test.ts`, 1914 / 2230 ROM rows; ball-open error -364 / -350 -> +1 / +14).
  T2 controller rows: ON missing 19 -> 2, extra 17 -> 0; OFF missing 6 -> 2, extra 4 -> 0. Census 0..99 both scenes: commands 100 / 100 identical, sound differs only in SE 15 rows; differential 133 / 133 identical.
(3) Scene ON Double Team plays SE_M_STAT_INCREASE 34 rows after its last SE inside the live move window (`emitDoubleTeamStatsChangeSound`; `tests/aud252DoubleTeamStatSe.test.ts`): ON stat-change SE missing 15 -> 0 (they were Double Team, not secondary effects); census ON commands identical, only SE 239 rows added.
- **Next:** AI mid-battle switch (seed 2741 res5: ROM extra SE 15 at the recall, tray / ball open ~75 ticks later than ours), SE_LOW_HEALTH 90 x1 (seed 2); ISSUES #219 trimmed.
- **NOT run:** full `npm test` (supervisor's); ran typecheck, aud24x / aud25x / tickSounds / audioProbeFixtures tests.

---

## 2026-11-16 — aud253 (ts lane worker): opponent AI-switch recall SE, player switch-in SE_LOW_HEALTH, sound only

- **State:** on master, committed (`7a8b8cec4` + docs). Sound-only (`battleStartSounds.ts`, `midBattleOpponentPartySummary.ts`, `screenSounds.ts`); section "aud253" in `docs/aud251-s11-scoreboard-refresh.md`; evidence `.integration/evidence/aud253/`.
- **Did:** (1) AI switch (seed 2741 res5): the kernel has no RETURNMON / return-to-ball, so the recall SE_BALL_OPEN is emitted with the opponent's no-lead party-summary draw, ahead of SE 114; the ~75-frame lateness of the tray / ball open / cry is a presentation gap (not fixed).
  (2) SE_LOW_HEALTH (seed 2) is `HandleLowHpMusicChange` in `SwitchIn_HandleSoundAndEnd`: now called on the player switch-in's BGM restore (Scene ON +71 frames later, one window); measured WEAK cry lengths for species 9 / 83 / 130 / 198 added.
  `tests/aud253AiSwitchLowHp.test.ts` + 2 ROM windows registered in audioProbeFixtures. Seeds 2 / 2741 both scenes: controller missing / extra 0 / 0. Census 0..99: commands 100 / 100 identical both scenes; sound adds only 11 SE 15 + 1 duck;
  differential (turn5 / turn13 switch-in) 483 / 483 identical.
- **Next:** the AI switch's presentation (RETURNMON + ball return), forced party-menu send-out low-HP SE, more WEAK cry lengths, a second Scene ON low-HP window; ISSUES #219 trimmed.
- **NOT run:** full `npm test` (supervisor's, per the brief); ran typecheck, `test:gate` (362 files / 2,843), aud24x / aud25x / tickSounds / audioProbeFixtures tests, build and build:lib 0. The T2 scoreboard was rescored on seeds 2 and 2741 only.

---

## 2026-11-16 night run (CAX31 supervisor, Opus 5.5, 13:30 -> 05:30 UTC): in progress

- **State:** folded: lazy1, luck1, aud242k / l / m / n, dl1, dl2, rrh4, aud251 (entries above / below). Running: aud242o (integration), lbw5 (side).
- **Website:** browser `lib` import ~3x faster (lazy1); first-battle download ~2,363 -> ~2,102 KiB brotli-11 (dl2: sprite sheets packed as image rows, decoded per species on first read;
  `docs/dl2-sprite-repack.md`; frames identical). No API change. dl1 (`docs/dl1-download-size.md`) ranks the rest: per-species pictures (~677 KiB, needs a hold rule + optional
  `spriteBase` option), per-move animation assets (~225), the retired canonical march (~63-190, needs a product decision). Also check the CDN serves brotli-11: the handoff's 3.26 MB matches gzip-9.
- **rrh4 (side):** R108, R105, R077 staged and matched on the ROM (53 / 110 covered); R065 -> class (b), R069 -> (a). Supervisor re-drove R108: match, 6 / 6.
- **lbw5 (side):** Lobby player <-> NPC cases proven on the ROM; bump direction change and turn-commit refusal fixed (`factoryLobbyFreeRoam.ts`, `idleIdx` pose state); forfeit window 109 -> 113 / 113; lbw4 / lbra / won-* windows unchanged; supervisor `npm run compare` lbw5-bump-turn-off 269 / 269.
- **aud242o / p (integration, sound only):** Petal Dance, Confuse Ray ball bounce, Tri Attack, Dive, Rollout counter, Encore, Flatter, Reversal, Taunt, Karate Chop, Revenge, Mist Ball, Leaf Blade;
  T1 missing-gated 195 -> **95**; T2 ON move-SE missing (21 seeds) **76** (aud251: 206); differentials 320 / 320, 240 / 240.
- **aud242m / n (integration, sound only):** Frustration / Flail, Confuse Ray, Spark; T1 missing-gated 308 -> **195**; differentials 240 / 240 each; census commands 100 / 100.
- **Nightly replay (item 0d)** on `b5bb454a9`: pool **44 / 44** (1,366 states), staged battles **69 / 69** (`docs/replay-ledger.md`). No luck-hunt summary yet (first day job 2026-11-17 05:45).
- **luck1 (side lane):** `tools/replay-hunt/luckHunt.sh` (+ `luckHunt.py`, `test-luckHunt.sh`, README "luckHunt") and 14 designs in `tools/replay-hunt/luck-designs/`
  (R030 R032 R035 R037 R038 R039 R040 R067 R080 R095 R097 R107 R109 R110; R106 impossible, R068 / R081 impractical, R103 / R105 / R108 need a hand set-up: `docs/parity-mac/rule-coverage.md`).
  Seeds `1,000,000 + 20,000 x days since 2026-11-16 + k`. Proof: 15 min, 96 seeds, 14 designs, 0 marker hits; deadline test ok. Supervisor checks: deadline test ok (past: instant, short: 19 s);
  a 150 s run leaves the checkout clean; the hit path on the covered R002 design: hit -> ROM drive -> match -> `found.stage.json` (`.integration/evidence/luck1/supervisor-hit-check`).
- **aud242k / aud242l (integration lane, sound only):** 10 more move-SE lifetimes (Ancient Power ... Recover) and Blizzard per pic-Y class; T1 census 0..99 ON missing-gated **570 -> 308**, extra 0;
  differentials 428 / 428 and 240 / 240 identical; census commands 100 / 100 identical (ISSUES #219).
- **lazy1 supervisor check:** same-load A/B (load ~4.8): `index.js` import **2,480 -> 810 ms** (base `b5bb454a9` built in a temp worktree vs master).

---

## 2026-11-16 — lazy1 (ts lane worker): website load time, step A (import-time work lazy, no behaviour change)

- **State:** on master, committed (`6d9d6ec10` opcode-name index, `ca46797a5` lazy thunks, `c6076ea27` test / tool names + `docs/lazy1-import-time.md`). No API change. ENGINE_BUILD `eb-b17e87a4a52c33ad` -> **`eb-56f55ed08774e7a4`** (dist-lib; tell the website).
- **Import time (Node `import()`, median of 5, box load 7.8, so about 3.6x the quiet figures):** `index.js` **2743 -> 832 ms**, `headless.js` **2106 -> 380 ms**. Quiet-box `index.js` about 230 ms: not shown below 200.
  Left: 467 ms of compiling 67 MB of chunks (step B, size), 39 ms `loadBattleScriptProgram` (stays, memoized), about 90 ms of data-chunk bodies, ~30 ms small tables. Per-item table in the doc.
- **Did:** (1) per-program opcode-name index replaces about 120 full instruction scans per handler build (30 -> 2 ms, also faster every turn at runtime); (2) `lazyValue` memo thunks for the 100 sample-battle constants of the legacy Battle 1/2 march (`battleScene.ts`, `battleSceneCanonical.ts`, Turn 13 / 15 / 16 adapters): no sample battle runs at import. Nothing deleted (all read).
- **Gates:** census seeds 0..99 ON and OFF vs parent `b5bb454a9`: 100 / 100 identical each (`rst197CensusDelta` bad 0, `soundCensusDelta` identical 100); `compare:differential` 8 traces (draft-menu, battle2-off-turn1-staged, battle2-turn1-rockslide, presentation-rng-playable-live-bodies-seeded-on, battle1-postwin-next-prompt, fight-submenu, battle1-swap-player-picker, lbw4-woman-block-off) **1,488 / 1,488 identical**;
  typecheck 0; full `npm test` as 4 vitest shards (3 workers) **15,018 passed, 0 failed** (shard 2 first run caught `battlesceneSplitEligibility` keyed on the renamed symbols, fixed, re-run green); `npm run build` and `build:lib` 0; vanilla soak 0:20 **20 / 20**;
  winning soak **0:24 24 / 24, per-seed lines identical to the parent** (`--parallel 6`).
- **NOT run:** winning soak 0:60 (only 0:24: two arms x 60 seeds did not fit the cap on a loaded 8-core box, 2.4 min / seed / core); `tools/probe/*` one-off scripts still import the old constant names (not in `tsc -b`, not run by tests).
- **Next:** step B (download size: 67 MB dist-lib, 467 ms compile); re-time on a quiet box. A supervisor may want the winning soak 6:60 as the closing check. Evidence `.integration/evidence/lazy1/`.
- PAPERCUT: `npm run typecheck` 5 min on a loaded box, ~5 min lost; the ability-item census pins source line numbers, so any line shift in `battleScript*` files breaks `abilityItemParityCensus.test.ts`, ~10 min lost; the foreground tool limit (5 / 10 min) backgrounded two of my runs, ~15 min lost (re-run sharded).

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

## 2026-11-16 — t1cls (ts lane worker): T1 classifier attributes the non-move SEs

- **State:** on master, committed; tooling only (`lsd194Census.ts` `soundCmd` column, `soundCensusDelta.py --t1`, `soundCensusExpected.ts --nonmove`), nothing under `src/`.
- **Did:** the 11,093 `unclassified` were SEs / pans inside non-move commands (status animations, weather, held item, leech seed, focus punch, stats-change; Sun's 5,207 pans = its pan task). Attributed by command window, compared per command with the table.
- **Counts (seeds 0..99 ON, arms `on-4e31b7675` -> `on-bd46a5fbf`, same src):** move family exact / missing-gated / extra **24,175 / 570 / 0 unchanged**; unclassified 11,093 -> **0**; non-move 11,093 exact, extra 0, **missing 128** (Status_Poison plays 5 of 6 SE 148: ISSUES #219).
- **Gates:** `npm run test:smoke`; no test imports the tool. Command and table in `docs/aud243a-sound-census.md` "T1 classifier (t1cls)". Evidence `.integration/evidence/t1cls/`.
- **Next:** ROM window for Poison's 6th SE; then the move-SE lifetimes of the wind-down entry.

---
