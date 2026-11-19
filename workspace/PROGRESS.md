# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-11-19 — CAX31 daily run (supervisor, Opus 5.5, 2026-11-18 13:30 -> 2026-11-19 05:30 UTC): wind-down: sound timing (hp lengths, script leads, pauses), Knock Off, Lobby exact, lighter download

- **State:** master clean, no workers, no worktrees; no push. **No DEFERRED items.** Final engine tree `26ed71da7` (= `f9cdc9c47`'s src; later commits are tests / docs). ENGINE_BUILD
  `eb-f174716c006360f8` -> **`eb-b3ecf44f29f55d03`** (dist-lib of `f9cdc9c47`; tell the website). Evidence `.integration/validation/sv-20261118/`; per-step briefs `.integration/briefs/`.
- **Website (Mac):** one ADDITIVE option, `FactoryGameOptions.spriteBase?: string` (dl3 / dl4, `docs/library-package.md`): battle pictures and move-animation assets now load as small files
  (`dist-lib/sprites/*.txt`, `sprites/anim/*.txt`); a bundler (Vite / Rollup / webpack 5) emits them by itself, an unbundled host serves `dist-lib/sprites/` next to the chunks or passes `spriteBase`.
  First-battle download ~2,112 -> **~1,541 KiB** brotli-11; the loop holds (no tick, no draw) while a needed file is in flight, so replays are untouched. `challenge-request` / `start` / `ready` /
  input unchanged; no new audio files. On screen: Knock Off's bag animation; hp bars, status plays and ~30 move bodies follow the ROM's timing; the Lobby after a forfeit / retire / record menu is ROM-exact.
- **Sound / timing (S11 frame alignment, ISSUES #219):** T2 ON 25 seeds and OFF 24 seeds stay **0 missing / 0 extra**; offset mass ON -15 % (t2r, mid-run), OFF -25 % (t2o). Landed: pau2 / pau3
  (script pauses; KOFail OFF 415 -> 558 / 620), mem2 (0x7FFF instant HP drop), kno3 (Knock Off: ON 32 -> 145 / 256), hpd8 (16 shape-A bodies: Aerial Ace 276 -> 771 / 1023), liv2 (7 long `live` windows:
  Earthquake 280 -> 667), sta5 (first status play: Toxic SE exact, Spore 368 -> 746), lse2 (Leech Seed body -29 -> 0, Hypnosis 174 -> 670 / 780), hpf1 / hpf2 (ROM hp command lengths instead of the
  28-row floor; OFF offset mass -1,280 alone), hpf3 (9 pins those moved: 6 toward the ROM; Absorb / Revenge / Razor Wind / Recycle now show their own body leads: lse3 measured them), ais4
  (faint-replacement send-in on the AI timeline: obr251 OFF 6 -> 91, ON 6 -> 178 / 306), ctl1 (controller emitters exact vs their anchors), bal1 (T2 switch anchor fixed in the driver).
- **Lobby (#221):** lbw7 / lbw8: lbra-forfeit-off / lbra-retire-off / retire-yes-lobby-freeroam-off and all 8 lbrb-* traces ROM-exact (NPCs resume at the script's releaseall; retire save +6 ticks measured).
- **Gameplay (item 0d):** nightly replay on `8516a6da1`: pool **44 / 44** (1,427 states), staged **83 / 83**. No battle-rule change this run (every fold census eventsDigest identical both scenes),
  so no wind-down permanent-list drive. Rare rules **61 -> 66 / 110** (R035 day hunt; luck5 R073; luck6 R051 / R052 / R053, each re-driven to a full ROM match; 16 new Metronome designs for the day job).
- **Gates (final engine):** vanilla 0:20 OFF **20 / 20**, ON **20 / 20**; 0:60 default / winning / winning-swap **60 / 60** each; varied-RNG winning carry 0 / 14 / 28 + winning-swap carry 0 **100 / 100** each.
  Full suite on `f9cdc9c47` (3 workers, beside the soaks): **16,005 passed, 0 failed**; build / build:lib 0. `play:random --minutes 10 --scene both --lobby-new-challenge`: ON 28 battles / 14 swaps,
  OFF 65 / 23; **0 page / console errors, 0 overlays**. Mid-run full suites: 15,937 / 15,963 / 15,970 / 15,988 / 15,997 all 0 failed; 70b797e28 and 4839b5b80 had 15 / 9 hp-pin failures (hpf1 / hpf2,
  bisected; fixed by hpf2 / hpf3). Disk 64 % -> 47 % (31 census `tree/` dirs, `.integration/evidence/TREES-PRUNED-20261119.txt`). Log backup not run (`rclone` not installed).
- **Census 0..999 both scenes (c1k, `docs/aud251-s11-scoreboard-refresh.md` "c1k", on `93dc3201d` = the final engine):** eventsDigest identical to aud263 on 998 / 1000 seeds per scene; 796 / 995
  (the frame-budget seeds) are the same battle cut later (hpd8 / hpf2 timing). T1 **0 / 0 / 0** both scenes after a census-tool fix (`lsd194Census.ts` scored lse2's shifted sound clock as declined:
  older census arms show 876 phantom rows on Calm Mind / Cosmic Power / Encore). Scene ON static-field commands: 1 (pre-existing: Ice Ball, seed 950, `unattributed-gate-301`).
- **Measured for the next run (docs only, after the gates):** pau4m: Intimidate / Trace switch-in prints are NOT presented (Trace ~142, Intimidate ~247 frames missing at battle start, both scenes);
  hpf4m: ROM hp lengths for every shape still on the floor (landing order in the doc); sta6m: sta5 step 2 applies in Scene OFF too (7 rows); phy1m: every Factory body is live in play, but 63.6 % of body commands lack the audited lead (+6 .. +14 rows).
- **Next:** (0) present the switch-in ability prints (pau4m); land hpf4m T1-S1 and sta6m; (1) land lse3 (`docs/hpd1-hp-hold.md` "lse3": Absorb / Mega Drain / Counter / Revenge / Recycle / Razor Wind, Wish's generic action-transition rows) and the rule-based lead for the unaudited bodies (phy1m; design + batches `docs/lead1m-rule-lead-design.md`); (2) hp shapes still on the 28-row floor (ticks, weather damage, confusion self-hit, Substitute: ROM labs first); (3) sta5 step 3 (patch kept; decouple the sound clock)
  and sta5 step 2's Scene OFF ROM check; (4) shape C bodies, multi-hit; (5) #222 player send-in residuals. Run the FULL suite before folding any hp / timing change (test:gate missed hpf1's 15).
  Luck-hunt summary + nightly replay at run start; prune census trees.

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
