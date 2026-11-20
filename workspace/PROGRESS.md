# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-11-20 — CAX31 daily run (supervisor, Opus 5.5, 2026-11-19 13:30 -> 2026-11-20 05:30 UTC): wind-down: sound timing -36 % (Scene ON), switch-in ability prints, button-wait messages, Brain music, 6 transitions, Shedinja HP

- **State:** master clean, no workers, no worktrees; no push. **No DEFERRED items.** Final engine tree `17f2a47e8` (later commits are tests / docs). ENGINE_BUILD **`eb-ffe38fb0b685bbe6`**
  (dist-lib of `17f2a47e8`; tell the website). Evidence `.integration/validation/sv-20261119/`; briefs `.integration/briefs/` (supervisor ledger `supervisor-notes.txt`).
- **Website (Mac):** no API change (`challenge-request` / `start`, `ready`, input contract unchanged). **Play changes:** battle messages with a `\p` / `\l` prompt (Substitute damaged / faded, Roar "dragged
  out", the Taunt / Disable / Torment / Imprison "can't use" texts, Trick both items, Static, ability blocks) now wait for a new A or B as in the ROM (btn1 / btn2; `docs/library-package.md`
  "Battle messages that wait for A or B"); games recorded on older builds replay on their own build only. **New audio files:** `bgm-471.ogg` + `aac/bgm-471.m4a` (the Factory Head battle song, ISSUES
  #224 closed; ~1.2 MB together). On screen: Intimidate / Trace prints at battle start and on switch-in, six Frontier transitions drawn as in the ROM, ROM hp-bar lengths for status / weather / wrap ticks.
- **Sound (S11, T2 ROM replays, t2n on `29688b8cd`, `docs/aud251-s11-scoreboard-refresh.md` "t2n"):** 0 missing / 0 extra every family (25 ON + 24 OFF seeds); offset mass **ON 55,711 -> 35,592
  (-36 %, exact rows 479 -> 1,007, move-SE exact 334 -> 820)**, OFF 6,125 -> 5,437 (-11 %). Landed: lead2 / lead3 / lead4 (lead1m B0-B3: 80 + 50 bodies take the ROM script lead; 18 + 4 ROM-checked,
  e.g. Facade 22 -> 480, Rock Tomb 111 -> 549, Protect 753 -> 863 / 1023), lse4 (Absorb / Revenge / Recycle / Razor Wind / Wish: Razor Wind 0 -> 378, Wish 130 -> 394; Recycle 538 -> 508, heal-animation
  residual), lfx1 (3 pins the gate missed, ROM-justified), hpf5 (hpf4m T1-T4 / S1 + sta6m: -5,280 frames per 200 battles, both scenes), pau4 / pau5 (Intimidate / Trace entry scripts at battle start
  and on switch-in / replacement: e.g. sta6m-intro-intimp OFF 334 -> 593, pau5-opp-intimidate OFF 73 -> 445), btn1 / btn2 (#223), bgm1, ice2 (census 0..999 Scene ON static commands 1 -> 0).
- **#225 (trn225):** 6 of 7 undrawn Frontier transitions drawn from source, 0 bad frames vs the ROM both scenes (SQUARES, SQUARES_SCROLL, CIRCLES_*); Noland room recordings compared further
  (e.g. silver-first-slow 1,239 -> 1,622). Open: LOGO_WIGGLE, LOGO_WAVE's older mismatch.
- **Gameplay (item 0d):** run-start replay on `0d2973b40`: pool **44 / 44** (1,346 states), stages **94 / 94**. Luck day 4: 7 / 7 ROM match promoted (`0d2973b40`); rrh5 (hand-built set-ups) +9;
  shd1: **Shedinja max HP 1** (CalculateMonStats; `src/engine/stats.ts` `calculateMaxHp`): the only engine rule change, census 0..999 both scenes 0 changed (set 21 is outside every Factory rental
  range, battle_factory.c:169: lab parties only). Rare rules **66 -> 83 / 110**. WIND-DOWN REPLAY: see Gates.
- **Gates (final engine `17f2a47e8`):** GATES_PENDING
- **Cleanup:** cln9 (5 unread scratch JSONs; 109 one-off scripts kept: tracked receipts name / hash them as their generator, `docs/cln9-oneoff-scripts.md`). The aud251 doc's 62 MB sed corruption
  (`b0e4cf53d`, last run) undone by t2n (177 KB). Disk: ~33 GB of census `tree/` dirs pruned (`.integration/evidence/TREES-PRUNED-20261120.txt`).
- **Lapse:** lead3's worktree was removed before its `.integration` evidence was copied (census arms lost; numbers are in `docs/lead1m-rule-lead-design.md` "lead3", log kept).
- **Next** (ranked by t2n section 5): (1) general / status-animation spacing (ON 25 % of the mass: SE 152 / 228 / 102 / 142 / 148, one ROM window on census seed 5063 first); (2) hit-controller rows
  SE 13 / 12 / 14 (OFF 41 %: the remaining hp-command shapes); (3) faint / send-in chain (driver anchor first, then ball-open lag); (4) lead1m B6 charge turns (Dig / Solar Beam / Fly), B4 C bodies,
  B5 adapter windows; (5) Recycle's heal-animation start (lse4), LOGO_WIGGLE / LOGO_WAVE (#225), #223 remainder (box clear 1 row late). Run the FULL suite before folding any timing change.

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
- **Also measured:** subp1m (ISSUES #223): Substitute damaged / faded, Roar "dragged out", the Disable / Taunt / Torment / Imprison "can't use" texts, Trick both-items and Static wait for an A / B press
  in the ROM (no auto-advance in a Factory battle); our engine moves on after 24 rows. ice950m: the last static Scene ON command (seed 950 Ice Ball) is an unattributed sprite-order gate; one-line fix in the doc.
- **Next** (ranked by rank1m, `docs/rank1m-next-run-impact.md`: pau4m 251 / 1000 battles +31.5k frames, #223 192 battles, lead1m B1 393 ON battles, hpf4m T1 38): (0) present the switch-in
  ability prints (pau4m); (00) #223 button-wait messages (tell the website: play changes); land hpf4m T1-S1 and sta6m; (1) land lse3 (`docs/hpd1-hp-hold.md` "lse3": Absorb / Mega Drain / Counter / Revenge / Recycle / Razor Wind, Wish's generic action-transition rows) and the rule-based lead for the unaudited bodies (phy1m; design + batches `docs/lead1m-rule-lead-design.md`); (2) hp shapes still on the 28-row floor (ticks, weather damage, confusion self-hit, Substitute: ROM labs first); (3) sta5 step 3 (patch kept; decouple the sound clock)
  and sta5 step 2's Scene OFF ROM check; (4) shape C bodies, multi-hit; (5) #222 player send-in residuals. Run the FULL suite before folding any hp / timing change (test:gate missed hpf1's 15).
  Luck-hunt summary + nightly replay at run start; prune census trees.
