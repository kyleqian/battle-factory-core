# Issues — standing backlog

Open bugs and debts only, numbered (numbers are never reused). When you fix one, **delete the entry** in the same docs
commit that records the fix in `PROGRESS.md` — git keeps the forensic history. Per entry: symptom, what is confirmed from
the reference / oracle, and any leads.

Pre-cleanup history (closed addenda, #72, #121 and the long dated narratives of #39 / #55 / #71 / #73) is in
`docs/archive/ISSUES-pre-cln238.md`. The settled exceptions #5, #18, #38, #56, #61, #87 and #97 are **not work**: they are
recorded in `ROADMAP.md` "Settled exceptions" (accepted ceilings; do not reopen without a user decision).

**Current scope, user-approved 2026-10-13:** the remaining Factory animation, presentation and battle-engine accuracy
defects are all authorized in the finish-up mission (`docs/factory-finish-scope.md`). #141 / #140 / #139 may change
gameplay / RNG when proved against source; use main-lane ownership and gameplay gates. Historical presentation-only
exclusions are superseded. Unrelated expansions stay parked.

## #221 — Lobby RNG cursor: harness / unmeasured routes (lbw1 / lbw2 / lbw3, 2026-11-15)

- E1-E3 (battle-exit VBlank hold, Pokerus + save-block draws, Lobby map-load draws) fixed by lbr-g (`src/engine/battleExitRng.ts`,
  `tests/battleExitRng.test.ts`), E4 (the woman / fat man wander draws) by lbw3 (`docs/lbw3-lobby-npc-port.md`; offset 0 on 6 ROM traces from the rebase to the end). Open:
  - **Harness:** every lbra / lbrd `appStage` injects a non-ROM `rngValue`; the traces now carry an `appRngRebase` (values in `docs/lbw1-lobby-wander-evidence.md` and the trace files).
  - **Unproven in the wander port:** retire-after-won / injected / attendant-return entries (shared rule); lbw4 measured the player in the woman's way (`docs/lbw3-lobby-npc-port.md`), still open there: a same-frame race for one tile, a turn-commit refusal by the woman, the fat man in the player's way, a direction change during a bump.
  - **Unmeasured:** the won route's real battle exit (reuses the loss rule), the non-terminal win's PreBattleRoom entry, a full
    boot -> draft -> battle -> forfeit route.

## #218 — iss216 residuals (2026-11-14)

- `iss216-same-species-off` (staged duplicate pair, Scene OFF): 391 / 469 frames. The refusal window 169..244 is exact. Left: (a) after the
  dismiss the rented ball's frame is one tick off the ROM (133..176 px every 7 / 4 frames, 264+; ball stall after the refusal / dismiss print
  tried 0 / 1 / 2 ticks, none exact); (b) the OFF-profile flash-close residuals (frames 37..57, 139, 142, 247..263, 407..427), the same
  pattern as any OFF rent close. The refusal costs no ball stall on the ROM; the dismiss costs one.
- #217: the trapped switch text (`gText_PkmnCantSwitchOut`, and `gText_PkmnsXPreventsSwitching` for Shadow Tag / Arena Trap / Magnet Pull) is
  Tier-1 from source (`tests/battlePartySelect.test.ts`), no ROM lab window: the WIN_MSG route is the one the no-energy refusal already
  proves; the `\p` ending of the ability text is treated like PAUSE_UNTIL_PRESS (unmeasured).

## #220 — Held-item effect animation (B_ANIM_HELD_ITEM_EFFECT): small residuals open (aud250, 2026-11-14)

- Steps 1-3 done (SEs: `docs/hie3-held-item-sounds.md`): hie1 presents the segment length in both scenes (Scene ON `general-animation` HELD_ITEM_EFFECT, 214 + lead 15 restart /
  9 continuation; Scene OFF a Pausex20 hold), hie2 / hie2b draw it in Scene ON (rotation, stars, ring, tint, both sides; age 0 = command
  length - 204). Drift-aware proof (`docs/hie2-held-item-render.md`): every in-window frame matches the ROM at the lab's pre-segment offset
  (Sitrus both sides 229 / 229, Shell Bell 223 / 223, Leftovers 229 / 229, Cheri 192 / 192). Open remainder:
  - **Residuals:** Shell Bell and Leftovers +1 frame (window and print) against the pre-segment offset (hie1's Leftovers "+8" did not
    reproduce under the drift-aware measure: it was measured against another offset). Cure berry (Cheri): ROM ages 1-11 are drawn inside
    the preceding 32-frame `status` command; the app starts the view at age 12 (11 frames, <= 964 px at 49,74-97,112). Unmeasured: a berry
    behind a Substitute (Scene ON skips the command), multi-print berries (confuse / stat berries), an elevated opponent's shadow window.
  - **Post-heal tail** (pre-existing): after `ItemHealHP_Ret`'s HP update (Leftovers / Shell Bell) the app's next text starts ~17-19 frames
    later than the ROM in both scenes (Sitrus / RemoveItem path exact).
  Plan: `docs/hie-scout.md`; `docs/aud250-general-anim-sounds.md`.

## #219 — S11 sound gaps after the aud248 scoreboard (2026-11-14)

`docs/aud248-s11-scoreboard.md` (T1 census 0..999 + T2 ROM replays, ~20 aligned seeds per scene; reproduce with
`tools/audio/aud248RunSeed.sh` + `tools/audio/soundScoreboard.py`). S11 acceptance is not met. Ranked missing families:
1. move-animation SE streams (largest); 2. stat-change SE 239 / 245: emitted since aud248 at command age 7, ROM-minus-ours -2..+23 frames per
window (pinned in `tests/aud248StatChangeSounds.test.ts`), secondary-effect stat changes (Metal Claw, Steel Wing) are not `stats-change`
commands and stay silent; 3. cries (cry-task rows not ported); 4. battle-controller extras and window-end artifacts; 5. SE_SHINY and declined
(static) move bodies. Scene ON seeds 6568 / 7682 stall at the 80,000-frame ROM drive cap and cannot be aligned.
- **aud249 (2026-11-14)** emits the nine `Status_*` and the four weather-continues SEs (Scene ON; `docs/aud249-general-anim-sounds.md`). Open:
  the second `Status_*` play of one animation lands ~14 frames later in the ROM than modelled and the first play +2 over the stat anchor;
  TurnTrap / Snatch unresolved in the extractor.
- **aud250 (2026-11-14)** emits FOCUS_PUNCH_SETUP / LEECH_SEED_DRAIN / CASTFORM_CHANGE (anchors 5 / 7 / 5, ROM windows). Open: the second
  `Status_*` play is 14-15 frames later in the ROM (not a loop error; needs a pixel window of the second play); `Status_Freeze` SE 242 moved +1
  by the wait+1 rule without a ROM window; held-item effect SEs landed in hie3 (#220).
- **cry1 (2026-11-15)** emits the cry-task cries, stops and BGM restores of Roar / Howl / Hyper Voice (`docs/cry1-cry-tasks.md`; first cries frame-exact against ROM windows, the second cries and restores from a fitted per-species length model, 0 residual on 141 measured species-modes). The five cry-task modes are recorded and played from their own assets (cry2: `docs/cry1-cry-tasks.md`). Open: Roar / Howl windows inherit a lab drift (+13 / +13 / +1 / +4) so their script-frame offset is unverified apart from the drift-free Hyper Voice anchor; the model can be off by one for a species near a step edge (none seen in 32 pre-registered edge species).

## #214 — Leads from the Mac lane's 2026-11-12 passes (source-read only, no ROM seed)

- Cure berries after Pursuit-on-switch: `HandleFaintedMonActions` state 6 runs `ItemBattleEffects(ITEMEFFECT_NORMAL, 0, TRUE)` for the player's
  battler; the engine ports only White Herb there (a status berry cures a few steps early in the ROM). Low value.
- Census battle 32 trips `sa125`'s ON - OFF row check on a CONFUSION anchor (139 vs 100); presentation, not looked at.
- Long / endless Struggle-Leftovers stalls (796, 1986, ... `docs/parity-mac/STATUS.md` "Still open") match every state up to the ROM cap; not bugs.

## #200 — Opponent faint-replacement party summary residuals (obr251, 2026-11-07)

`docs/obr251-opponent-party-summary.md`: bar slide / hold / fade / SE are ROM-timed and the bar frames 527..546 are exact
(`obr251-opponent-faint-on`). Remaining: (a) Scene ON drops the faint-text `▾` cursor at A, the ROM keeps it until the "sent out"
first glyph (37 px, bbox 61,141-67,147); (b) Scene OFF: the ROM clears the message box at A+1, ours keeps the text (608 px), mechanism
unproven; (c) `ballDisplay.states` fainted / status labels are swapped relative to the ROM tile order (healthy 0, empty 1, status 2,
fainted 3) in the intro tray, `drawTypedPartyStatusSummary` and the opponent exit path (left alone to keep the aud241a pins);
(d) the fade is not drawn across a presentation segment boundary.

## #199 — BAG / RUN / forfeit presentation residuals (frf250a / frf250b, 2026-11-06)

Rules and text are ROM-exact; cosmetic frames remain. frf250a compares: `frf250a-bag-off` 152 / 171, `frf250a-run-no-on` 166 / 181
frames — the differing frames are the action-menu idle bounce (healthbox / player sprite, bbox ~49..229 x 74..111), incl. frame 31 before
any A press, so likely the settled #56 idle-bounce class; not attributed frame by frame. frf250b: Scene OFF `frf250b-run-yes-off`
250 / 250; Scene ON unmeasured as a trace, cosmetic gaps in `docs/frf250b-forfeit.md` "Known gap: Scene ON" (healthbox bounce step
~155, opponent sprite region during the fade 249..284). `advanceForfeitTerminalAge` is a measured +1 on the lobby-return clock.

## #198 — aud242a move-animation SE residuals (2026-11-06)

`docs/aud242-move-anim-sounds.md`, `tests/aud242aMoveAnimSounds.test.ts`: the emitter plays a script op at body age `f + 1 + 7`
(Scene ON lag 7, as battleHitSounds). Constant per-move offsets ROM minus ours remain: Ember / Psybeam / Acid / Bite +2, Twineedle
+10, Double Slap / Fury Swipes +9, Bind +6, Agility / Swords Dance -4, other status moves -2..-5 (`LIVE_MOVE_IDLE_LEAD_ROWS` was
measured as visual onset, not script start; an alignment audit is the lead). Not emitted yet: ops after a data-dependent wait,
`jumpret*` runs, `panse*` / `setpan`, `createsoundtask` (aud242b / c); declined (static) bodies (Tackle, Vine Whip, Seismic Toss)
are silent. **aud242b (2026-11-06)** added a wait resolver (`docs/aud242-move-anim-sounds.md` section 6) but it emits only 4 more
ops: 501 stay unresolved (unmodelled sprite / palette lifetimes 351, `waitbgfade*` 134 -- needs a frame model of `Task_FadeToBg`,
`waitsound` 11, branch 5). Its ROM windows: Dragon Rage +3 constant, Mega Punch SE123 +1 (inside `call SetImpactBackground`), Haze -6,
Hyper Fang +2. **aud242c (2026-11-07)** resolved fades / panse / setpan / createsoundtask / PlaySE1/2WithPanning (739 ops resolved):
measured constant offsets Flamethrower +5, Ice Beam +1, Fire Blast / Aurora Beam / Psybeam / Superpower / Icy Wind +2, Metal Sound -2,
Sweet Scent / Flatter -3, Cosmic Power -5 (Hyper Beam, Dragon Claw, Mach Punch exact). Open: BG load lag measured for IMPACT /
HIGHSPEED / DARK only (`restorebg` lag unmodelled); 7 `panse*` and 42 PlaySE*WithPanning sites behind sprite / visual-task lifetimes;
cry tasks (PlayCryHighPitch, PlayDoubleCry, CryWithEcho, WaitForCry) not ported; Ice Beam's 7 SE137 rows, Crunch's 2nd SE ROM-only;
the ROM keeps calling SE12PanpotControl after its SE ends (probe `noop`), ours emits them: playback must ignore a pan with no SE.
The ROM reaches pan +64 on `SE_M_STAT_INCREASE` vs an opponent target (check `BattleAnimAdjustPanning2`).
**aud242d (2026-11-07)** instant tasks + BlendBattleAnimPal / Exclude / BlendParticle / complex_palette_blend / metallic_shine
(L50 emitted 550 -> 592, all 783 resolved): Thunderbolt / Icy Wind / Double-Edge / Metal Claw / Steel Wing +2, Hail / Sunny Day -4,
Calm Mind -5; `AnimTask_MetallicShine` loses 4 wall frames at creation (2 localised), the SE_M_HARDEN loop's 2nd SE +2 extra. Open:
`HardwarePaletteFade`, Thunderbolt SE215 one frame late, Hail / Sunny Day rows after 760 not emitted.
**aud242e (2026-11-08)** sprite / mon-task lifetimes (L50 640 emitted, 194 gated; all 833 resolved): Toxic +3; Rock Tomb / Sludge /
Poison Fang / Water Pulse / Rolling Kick / Double-Edge / Overheat +2; Water Gun 0; Absorb / Mega Drain / Giga Drain -1; Counter -16 (used
second). `simple_palette_blend` corrected one tick shorter from ROM BlendPalette logs, so Hyper Beam 0 -> +1 and Ice Beam +1 -> +2 (toward
the +2 class: the alignment audit is the lead). Open: Overheat SE147 rows +3 more, Poison Tail later rows +4, Thunderbolt SE215 +1;
next blockers hyper beam orb (52 ops), Hydro Pump orb (44), Fire Spin (42), aurora ring (40), air wave (40), power absorption orb (35).
**aud242f (2026-11-08)** BowMon / HornHit / Ice Beam + Ice Punch crystals / fist / BreathPuff sprites, ScaleMonAndRestore / GrowAndShrink
(L50 674 emitted, 160 gated; all 868 resolved): Horn Drill 0; Headbutt / Ice Punch / Ice Beam (its 7 SE137 rows now emitted) / Hidden
Power +2; Swagger -3, Growth -4. Blizzard's snowball ends off-screen (per-species pic offset:
needs a species-aware model, doc 10.5); Tri Attack, Bubblebeam, Luster Purge, ExtremeSpeed, Psychic, Curse, Spark, Attract unmodelled.
**aud243a (2026-11-08)** census T1 over 0..999 Scene ON (`docs/aud243a-sound-census.md`): 14,353 gated op sites (13,796 `end`, 557
`unresolved-branch`; top Sludge Bomb, Bubblebeam, Struggle, Blizzard, Thunderbolt, Psychic, Tri Attack, Dream Eater), 240 cry-task sites
(Roar 208, Hyper Voice 24, Howl 8), 400 pan rows after the body ends (Signal Beam 350, Mud Shot 50: task SEs outlive the body). The
offsets above are invisible to T1 (known-offset 0); they need the ROM replay (aud243b).
**aud242g (2026-11-09)** (L50 692 emitted, 142 gated; all 894 resolved): Dream Eater +1, Tri Attack / Bubblebeam / Thunderbolt +2; Thunderbolt's
three rows after the nine-sprite step (SE_M_HYPER_BEAM, both SE_M_THUNDERBOLT2) +1 more, undiagnosed. Dream Eater's two SE197 sleep rows
(ROM 272, 565) not emitted. Still gated: Tri Attack's `gLargeFlameScatterSpriteTemplate` / `AnimTask_ShakeTargetInPattern`, the
`ElectricityEffect` wait ending Thunderbolt / Spark.
**aud242h (2026-11-16)** `blend_color_cycle`, Shadow Ball ball, vertical dip (L50 697 emitted, 137 gated; all 899 resolved): Psychic +2, Body Slam +2,
Growth's 2nd SE152 exact at its -4 (`docs/aud242-move-anim-sounds.md` section 12). Open (top census gated ops): Sludge Bomb 198 (SE-length table,
`waitsound` keeping `pending`, hit-particle / poison-bubble lifetimes), Blizzard 88, Faint Attack 62, Confuse Ray 47, Dig 37, Spark 32, Struggle 30,
Attract 28; Shadow Ball ball has no ROM window (Rattata-only stage is Ghost-immune).

## #194 — Opponent RATTATA Quick Attack differs above the clip row (qak247, 2026-11-04)

Live Scene ON, opponent RATTATA Quick Attack vs player ONIX (`docs/qak247-clip-sweep.md`): 14,739 px over 25 of the 33 window
frames, rows 41-73, from age 8, identical with the 74 and the 160 clip (so not the clip that qak248 removed). Every other of the
87 measured opponent Quick Attack / Aerial Ace runs is 0 px at 160. Undiagnosed: stage it again and compare the attacker's
position / ellipse rows first (small sprite, corner row unusual?).

## #197 — Battle timing deltas found by the aud241b sound windows (2026-11-05)

`docs/aud241b-battle-sounds.md` (fixtures `tools/audio/fixtures/{super-effective,lowhp,lowhp-faint}*`, pinned as `frameDeltas` in
`tests/aud241bBattleSounds.test.ts`): (a) "It's super effective!" holds 5 ticks short (ON `[0,-5,...]`, OFF `[-1,-6,...]`);
(b) the second attack of a turn plays its low-HP SE 1 tick early; (c) after a red drain to 0 the faint sounds are 16 ticks late
(our `hp` command's 28-tick floor; the ROM drains the last 8 px in 12). The same frames move pixels, so these are presentation
timing residuals (finish plan item 6). A fix re-pins the deltas to 0.

## #196 — aud241a flow mismatches (2026-11-04)

`docs/aud241a-battle-start-sounds.md`: MAGNETON Scene ON player side 1 frame early (go246 hold); battle-BGM-to-tray gap is
348 / 359 / 368 / 374 across labs (engine 359); a WEAK send-out cry gets its duck restore only for ONIX (cry length known);
an opposing switch-in inside the forced-selector prefix gets no sound; a Baton Pass hidden-attacker recall is not
distinguished from a plain recall. Unproven by ROM window: Brain 471, WEAK send-out cry, Scene ON voluntary / opponent mid-battle.

## #192 — Summary screen flow gaps vs the ROM: swap-summary residuals (aud240b 2026-11-03; (a) / (b) FIXED sum259 2026-11-09)

(c) swap summary UP / DOWN landed in sum259 (`docs/sum259-summary-flow.md`), `sum259-swap-summary-mon-change` 208 / 242 vs the ROM:
29878, 29880..29897 mon-change sprite area (#188 class); 29842 / 29914 (18 / 68 px, undiagnosed); 30036..30043, 30052..30056 the two ball
sprites' shading after returning on cursor 1 (cause unknown; ball roll / epoch for a non-zero cursor is a guess). Swap mon-change sounds not
compared against ROM audio.

## #193 — Summary sound scheduler debt (aud240b, 2026-11-03)

`src/engine/screenSounds.ts` keeps its delayed-sound queue (open cry +63, stop +22, mon-change cry +21/+22) in module-level
state, gated on `soundCollecting()`; it should be owned by the session's sound collector so two sessions in one process cannot
share it. WEAK cry length is measured for ONIX only (78 frames; other species emit no BGM restore). BGM ids are constants
(469 draft / swap, 476 battle) until a BGM state exists (aud241). The first draft mon-change cry is 1 frame late vs the ROM
(f149 vs f148; every other change matches +21).

## #189 — RETIRE-YES Lobby path residuals (ret218, 2026-10-28)

ret218 hands RETIRE-YES to the loss terminal (no more hang). `retire-yes-lobby-freeroam-off` (Scene OFF) 1243 / 1482:
(a) the record prompt starts ~6 ticks later on the retire path than the loss-pinned 169-tick delay (frames 7544-7627, cause
unknown); (b) the wandering lobby NPC's schedule depends on `gRngValue` history keyed to the loss run's ticks (frames 8033-8193).
The terminal-arrival branch of `renderPostwinRetireWarp` (core.ts) is probably dead now. Timing class: long tail.

## #188 — Summary front animation: 137 species approximate-static motion; QUILAVA replacement one render late (finish plan, sfa214 2026-10-27)

sfa214 made the draft Summary screen crash-free for every Factory species. Open, non-crash residuals:
(a) 137 / 376 species (42 `pokemon_animation.c` motion types) play the frame program only, no source motion
(`summaryFrontAnimation.ts` `motionClaim`); (b) `summary-info-quilava-v-stretch` (mon-change replacement sprite)
48 / 91 vs the Scene OFF oracle: the whole replacement animation shows one render later in the ROM; the initial-sprite
trace is 108 / 121 (2-8 px affine-edge residual on 13 frames). Anchor Summary traces stay exact. Timing class: long tail.

## #168 — remainder: FRZ frozen-turn timing phase (S10A; #168 otherwise DONE 2026-10-13)

All nine B_ANIM_STATUS_* animations are timed and drawn (88 + 16 dense ROM windows 0 px; live audit 28 clean), and since inl144
(2026-10-13, merged `1c801184b`) a status animation over an INVISIBLE battler draws its sprites while the battler stays hidden (inv142's
banked patch landed; inv142Run.sh ALL SAME). Open (D4 class, aud137): FRZ's frozen-turn active rows are 115 vs production's 116 on 4 / 10
windows (the next message one frame late); cause named, not proven.


## #167 — remainder: Scene OFF no-hit pauses for Wish / Baton Pass / charge-turn EMPTYSTRING3 (S10A, 2026-10-11)

Landed pieces (Rest, stat-stage-change-next class, Wish, the action transition in both scenes, Scene ON tails, faints, Rest /
Bulk Up second stat) are in the archive entry and git. Still open:
- **Scene ON zero-tail live bodies** (tl204, `docs/tl204-zero-tail-rows.md`): next print early by Double Team -5, Rain Dance -5,
  Sunny Day / Hail -6, Leech Seed -39, Light Screen -4, Charm -6, Fake Tears -1, Calm Mind -10, Scary Face -19 (tl205 was to
  implement the script-row tail on a branch). 24 further moves carry a 0-frame tail pending a ROM scenario (ont193).
- **Named residuals:** Toxic's upstream -19 (status body before the message), Snore +10, Toxic -2, Curse +2 / -4 (re-measure after
  the floor drop), msg175's Rest-route Tackle HP anchor -3 ON / +18 OFF, Roar OFF +17, Baton Pass OFF -66.
- **Unmeasured:** switches, end of turn and pre-move prints after the anchor.
- **(b)** sprite-visibility next after Roar / Whirlwind / opponent Baton Pass (141 bodies): the entry says it needs #146's Scene
  OFF forced switch-out first (the ROM removes the sprite in one row).
- **(c)** nothing next (35, player Baton Pass: the party menu opens; unstaged).
- **(d)** charge turn (`docs/chg161-charge-turn-print.md`): Scene ON's live charge animation starts 7 rows late (the box carries the
  post-waitanimation rows; needs a presented post-animation hold); the held print -> next action's "used" edge is -10 .. -14
  (Sand-Attack control -12, same family as the action transition); Razor Wind -1 adapter.
- **(e)** small: Curse's 2nd / 3rd messages +1 frame each; Rest's status icon on G+127 vs ROM G+125.

## #161 — Dive attack: an extra lag frame at age 17 on poisoned player-diver routes (S10A, found 2026-10-10 by st76)

docs/st76-status-gates.md: 5 of 34 PSN player-attacker windows run 94 rows (lags [17, 85, 86] instead of [84, 85]); 0 / 73 unstatused,
0 / 29 BRN opponent-attacker. Every displayed image is correct (with the repeated ROM row skipped, 93 / 93 rows 0 px); production presents
the dominant 93-row phase (29 / 34). Mechanism unknown (RAM at activation identical). Resume: name the age-17 lag source from counters,
then record it as a third Dive D4 parameter (docs/faithful-timing-policy.md) or gate the shape.

## #154 — Staged lab probe trajectories differ between batches run at different times (S10A, found 2026-10-09)

plans51's Outrage jobs (`tools/integration/plans51Probe.py`, BODY200; base scenarios `tools/battle-lab/mechanic-outrage-*.json`,
pinned lab seed 305420201) gave A == B inside every batch, but the worker's 11:40 batch and three supervisor batches at 12:2x
(same worktree, byte-identical scenario files, same tool sha, vendor ROM / ELF / libmgba-py unchanged) differ: the last pre-battle
sprite "clear" frame is 1165 vs 1189 (player-attacker jobs) / 1154 vs 1195 (opponent), the battle starts at the same frame
(Outrage body at n 2082 in both), and the player-side battles then diverge (ou-ply-149-95: 291 vs 193 rows — the worker saw Onix's
Tackle and a second Outrage, the reruns did not). The FOCUS_BAND jobs (explicit "seed" op) reproduced byte-identically across the
same two times. Not the oracle symbols cache, the output-dir path, or the concurrency mix (solo / 8-job / 12-job reruns all agree
with each other). The Outrage plan is EXACT on both sample sets (147/147 worker, 10/10 fresh), so plans51's landing stands; the
hazard is that "two fresh runs identical" inside one batch does not prove cross-session reproducibility for these stagings.
Resume: rerun one ou-ply job at several wall-clock times and diff `lab.prepare`'s staged state (gRngValue, party structs, the
frame count to CB2_InitBattle); check whether the lab seed is applied before or after a frame-dependent step.


## #153 — remainder: Substitute / Transform presentation shared by both scenes (Scene OFF body FIXED 2026-10-13, sub157)

Open, the same in both scenes (ROM OFF == ON):
- **Transform:** body + transformed field are live in both scenes (trf174, `docs/trf174-transform-live.md`). Open: declined
  Transform bodies (shiny DITTO, SPINDA target, CASTFORM, a doll on either side); every OTHER live body declines while a battler
  is shown transformed; Transform is not counted in `LIVE_MOVE_ANIMATION_IDS` / the live-status inventory (accounting only; trs190
  audit 2026-10-16: no production reader; reachable only via Metronome, CHANSEY_1 / CLEFABLE_1; outside the 276). Counting it as a
  *required* body like Struggle needs a user scope call; until then it stays a live body outside the counted catalogue.
- **Not measured:** a dense OFF fade window, and the switch-out SUBSTITUTE_TO_MON / Baton Pass MON_TO_SUBSTITUTE special
  animations (scene-independent in source; neither scene presents them).

## #152 — Species audits 9-14 remainder: idle-rest attacker class, Extrasensory split rows, Confuse Ray CPU phase, TYRANITAR rows (S10A, 2026-10-07)

Evidence `docs/live-species-audit-9.md` .. `-14.md`, receipts `tools/integration/fixtures/species-audit-9/`. Open remainder:
- **Mach Punch (183), opponent-side target with an idle rest:** one row (age 60) unexplained; the live adapter DECLINES such
  targets. Resume: RAM-probe the target x2 at ages 58..61.
- **Meteor Mash (309), player-side FLYGON target:** not a production defect; the derived audit fixture's pinned Random2 activation
  is 4 steps late (0 px only at -4); why the two FLYGON probes record 4 extra steps is unexplained.
- **Extrasensory opponent-side targets FLYGON / GOLBAT / WAILORD:** 18,345 / 8,318 / 162 px on ages 43..117 in the policy phase;
  likely the scanline-split class (prep30 s1.4) but the split line was not measured.
- **TYRANITAR rows:** Dive 4-9 px (ages 63..64; Sand Stream intro?), Ice Ball 16 / 63 px, Memento 2,537 px at age 140, Flatter 2 / 96 px.
- **Doll-free controls (prep38 / dolldef):** Shadow Ball (247) PERSIAN -> SLOWBRO player 304,556 px (also in the doll-free control);
  Psychic opponent HAUNTER -> KADABRA 200 px on the pre-activation row; Quick Attack player (5,601 px in the doll box) and
  Double-Edge player after an earlier Double-Edge (480 px) unresolved (`docs/next-adapters-prep38.md`).
- **Audit 13:** ONIX attacker 1,091 px/row before its first move (Body Slam / Brick Break / Flamethrower / Attract, doll-free too);
  15 candidate renderers from the static attacker-rest scan (`a13fix-live-receipt.json`) unproven.
- **Substitute fade (`fade-live-receipt.json`):** the ROM shows a frozen message-box wait cursor on the fade rows after the "took
  damage" message, which production presents as an automatic (cursorless) message — 37 px / row; the fade's claim is scoped outside
  that footprint. Not measured: the ROM wait between that message and the fade, fades on a non-target (recoil), multi-hit or Baton
  Pass / switch fades, Scene OFF within the Substitute's own resolution (#153).
- **Audit 14:** Double-Edge row 33 with an idle-rest opponent attacker (410 / 1,091 px), Attract GOLBAT one full-field row.
- **Light Screen (113):** the PLAYER side also shows the hold phase (5 of 20 windows, 2,473 / 2,571 px on row 59) and a second
  buffered step at row 19 (after PRZ; after CONFUSION + a held-item animation on the opponent side, rows 19 + 59, 5,343 px);
  dominant direct on both sides (15/20, 10/14), so the policy renders the right phase, but the player-side and row-19 alternates
  are not yet documented in the D4 entry.
- **Harness limit:** the verifier passes only the attacker's personality, so shiny TARGET declines are unverified.

## #148 — Battler x2 history: unknown-history remainder (main bug FIXED 2026-10-06)

`src/engine/liveBattlerX2History.ts` tracks per battler idle | zeroed | unknown (`docs/x2-history-148.md`). Open: `unknown` (falls
back to the species rest) after the four `mixed` moves (move-0 status bodies, Razor Wind 13, Return 216, Dive 291), after
unmodelled general / status animations, a party menu or an undrained resolution; the forced switch-in phase does not advance the
host (catches up at the next command). Only opponent ONIX / RATTATA are affected.

## #147 — Elevated opponents in ordinary resolution frames: remainder (main bug FIXED 2026-10-05)

Open remainder: the 16 hit-blink frames per body (sprite + shadow hidden 4 on / 4 off) are not modelled for elevated opponents;
the HP-0 shadow boundary uses the displayed HP (may be one frame early vs the party-HP write); Sky Uppercut with a COMBUSKEN
attacker measured d = 0 vs the table's 1; Dream Eater / Sleep Talk swaps not harness-staged (table from the ROM d values only).

## #146 — Switch-out / send-in presentation remainder (S10A, found 2026-10-05; most tails FIXED 2026-10-13)

Fixed pieces (snd145 .. snd233, bso225 back send-out, bso226 battle-start intro, pfb229 faint-replacement send-in, cff230) are in
the archive entry and git. Still open:
- **Timing (not blocking):** the ROM waits for the opponent's battle-start front animation before "Go!" (39-98 frames later than our
  fixed intro timeline on long animations; bso226).
- **SHEDINJA maxHP (shd234 scout):** the "SHEDINJA genderless healthbox" residual is the comparison harnesses computing maxHP without the
  ROM's SHEDINJA rule (`pokemon.c:2845-2848`, `newMaxHP = 1`): `bso225Dense.ts:42`, `bso225Compare.ts:72`, `pfr192Dense.ts:34`,
  `snd182Compare.ts:66`, `plr162Compare.ts:66`, `pfb228Proto.ts:45`, `snd182Rows.ts:22`. **Check:**
  `src/engine/factoryCorpusParty.ts:291` has the same omission (setId 21 -> maxHP 94); it feeds `postwin.ts` — verify whether any
  visible / logical path reads it before fixing (main lane, source rule).
- **snd233 remainder:** star-particle 3-7 px at e 64.
- **pfb229 remainder:** ENTEI / KINGDRA glow-lag frame at B+69, CASTFORM message region, MEW has no player back pic.
- **Player faint-replacement send-in fidelity for non-MAGBY species** (pfr192 timing fixed): release palette fade, fade-in palette
  rows 56-70, species ball y path, male MAGBY healthbox art (`docs/pfr192-player-faint-replacement-production.md`); shiny send-ins;
  CRY_MODE_WEAK send-ins; PONYTA glow mid-frame palette row (D4 class, 616 px); TYPHLOSION faint-path slide lag frame (D4); the
  faint-path blank row one frame late; the elevated-attacker post-body field difference (1,444 px, untriaged).

## #145 — Live-adapter species audit: residual remainder (S10A; 7 defects FIXED 2026-10-05)

- **Rollout (205; `docs/rollout-curl-diagnosis.md`):** the hit-splat centre is hard-coded to ONIX's (`src/animation/rollout.ts:175-177`,
  y 42; BLISSEY 46) — a few px for 10 ages against targets with a different pic y; the shake amplitude is keyed by counter (`:209`)
  while the ROM uses `gAnimMovePower / 12` clamped 1..16 (`battle_anim_mon_movement.c:973-984`), so Defense Curl bodies decline.
  Fix shape in the doc (centre from the target anchors, shake from request power, drop the two declines, regenerate the Scene-ON Curl fixtures).
- **Open remainder:** Aerial Ace with a player-side GOLEM 1 px at ages 10-11; Spider Web ARIADOS back sprite 1 px; Sky Uppercut COMBUSKEN
  script one frame longer; Blizzard / Icy Wind fall back for the elevated pair by design (OAM-order proof only for non-elevated
  pairs); Dragon Rage with non-CHARMELEON player attackers formula-derived, unmeasured; Quick Attack / Mud Slap `+1` literal not
  swap-checked; GOLEM swaps exist only for Rock Throw and Foresight among the audit-2 fixes.

## #143 — CASTFORM non-normal forms (weather) are not modelled (S10A; normal-form residual FIXED 2026-10-05)

Per-form art, the CASTFORM_CHANGE morph (cff230 / cff232) and 32 proven (move, role, form) keys are live (`docs/cff230-castform-forms.md`).
Open: every live body declines while a CASTFORM is shown in a weather form, except the ROM-proven keys; unmeasured keys keep
declining (census 0..999: ~15 commands — Ember / Rain Dance / Fly / Ice Ball / Scary Face / Rest in other forms); Flamethrower by
WATER needs a +7 alignment explanation; the "at"-role keys (Fly / Ice Ball / Rest / Hail / Rain Dance / Scary Face) and revert /
switch-out are unmeasured; rain Icy Wind is a timing phase (lag ages [241, 242] vs [261], also without Castform: a D4 candidate);
the Substitute-swap composite still declines with a form shown; the latent front-coords width (source 32 vs app 24,
`battle_anim_mons.c:2253-2255`) for width-dependent moves is unexercised.

## #139 — remainder: Focus Punch pre-pass presentation edge routes (kernel + both scenes FIXED 2026-10-13, fpp150; edges fpc180)

Open: the voluntary-switch Go! -> used tail (-31, a send-in tail item, see #146); `5 + u` has no ROM card for Substitute / weather /
Protect / multi-stage prologues; a pre-move print after the focus print keeps 11. (Scene ON pre-pass print rows: fpo187 / ont193
explain and land the rest; `docs/fpc180-focus-punch-live.md`.)

## #109 — `battleAiSwitchInto.ts` omits the `i != monToSwitchIntoId[battlerIn1/2]` exclusion in both passes

**Found 2026-08-22** (side worker, #102 fix). Source `GetMostSuitableMonToSwitchInto`
(`battle_ai_switch_items.c`) skips a party slot already chosen for the other
active battler in both its scoring passes; the port (`:702-703`, `:757-760`)
does not. Unobservable in singles today because that slot is PARTY_SIZE at
the only call site (one opponent battler), so this is an unmodelled source
condition rather than a live bug — port it when doubles or a second consumer
arrive, with a Tier-1 pin.

## #114 — `runFutureAttacksAfterFaints` fires a delayed hit inline and keeps looping where source returns per effect (doubles-era divergence)

**Found 2026-08-22** (side worker, #102 end-turn cursor fix `6584bf9d`). Source
`HandleWishPerishSongOnTurnEnd` (`battle_util.c:1785-1888`) `return TRUE`s after
each Future Sight/Perish Song script and re-enters via `BattleTurnPassed`,
so a second delayed KO in the same turn takes its own `HandleFaintedMonActions`
round-trip; the port runs the remaining battlers inline. Equivalent now that
the `wishPerishSongState`/`wishPerishSongBattlerId` cursor persists
(`tests/endTurnResumeCursorIssue102.test.ts`), and unreachable in singles
(one delayed hit per side per turn) — pin it when doubles arrive.


## #71 — Send-out intro animations: banked front reducers are not wired into the live send-out seam; main-lane share of the dispatcher work

History, slices A-D and all probe receipts: `docs/archive/ISSUES-pre-cln238.md` #71.
- **User decision 2026-08-10:** the playable path stays FAITHFUL (no browser-only intro divergence). Battle Scene OFF genuinely skips
  send-out intros (`pokemon.c:6803-6852`, `HITMARKER_NO_ANIMATIONS` takes the `SKIP_FRONT_ANIM` branch; OFF sprites stay `x2 = y2 = 0`;
  RAM receipts `docs/send-out-slice-a-positive-case.md`, `docs/rattata-off-seam-flat-settle-probe.md`). Do not wire per-tick playback
  or terminal offsets into any OFF-profile seam.
- **Done:** all 62 front send-out families (376/376 species) are banked as reducers; the rung-3 dispatcher exists
  (`src/animation/sendOutDispatcher.ts`, `sendOutSpriteFrame.ts`); the 5 settle hooks and the 3 back-side hand-fit consumers are
  documented and throw-guarded (Tier-1 pinned). Scene ON now draws send-outs (see #146).
- **Still open, filler priority (internal code health):** the section 1e 56/58 move-window patch-site retirement
  (`docs/send-out-live-wiring-consumer-map.md` 1e; a pair-guard refactor) and the KABUTO / MAGBY / ONIX hand-fit retirements
  (`src/animation/speciesIdleAnim.ts:44` ONIX front terminal, `src/engine/magbySendOut.ts:18`, `src/engine/battleMenu.ts` ONIX back,
  `src/engine/kabutoSendOut.ts`) into the dispatcher, coordinated cross-lane. Acceptance bar: `docs/send-out-intro-animation-program.md`
  section 7 (RAM probe of the settled sprite, dense oracle window twice fresh, sibling-species spot-check).

## #73 — Terminal-seam remainder: the win/loss window's oracle-coverage gap (rung B)

History (increments i-iii, ~40 dated receipts, fixture names and frame counts): `docs/archive/ISSUES-pre-cln238.md` #73.
- **Landed:** WIN and LOSS/DREW terminal scripts run as real second VM passes with resolved message / trainer-slide events;
  `TRAINER_SLIDE_TIMING` is 38 (pixel-fit); the covered boundary runs from the DESTIN slide through GO ON scouting pages, type /
  style commentary, swap offer (NO and YES), guide dismissal, walk, warp and the Battle Room handoff, and the LOSS decline
  continuation, each pinned by a committed dense trace and `docs/post-terminal-*-evidence.md`.
- **Open:** (1) WIN far side: at frame 10638 the ROM's next trainer is LILIANA (id 9) while the synthetic terminal stage generates
  ABBIE (id 73) from its modeled RNG seed; the scaffold adopts the ROM cursors (`adoptedNextOpponent`), the generic fix is #55's
  ambient-VBlank construction stream. (2) Swap-screen ball-rocking after the first anim-end: per-ball `Random()%5` ambient RNG
  (#55-adjacent); the committed YES endpoint stays 248/248 at 10177, the dense extension is 277/285 (eight residual frames on ball 2).
  (3) Unexercised continuation choices by user decision 2026-08-05: RECORD is stub-only (no real recording / playback), REST is
  deliberately unselectable (real game saves + soft-resets; no save system in scope), RETIRE is implemented (YES = loss ending, see #189).
  (4) LOSS: record playback and free-roam lobby movement remain the open boundaries beyond the decline continuation.

## #55 — Rental-construction RNG stream contract cannot represent ambient VBlank interleaving

Full evidence (77 `docs/issue55-*` docs, CGB4 cycle-pricing receipts through v44, probe ledgers): `docs/archive/ISSUES-pre-cln238.md` #55.
- **User decision 2026-08-13: PARKED — distribution parity is the product bar.** Hardware-stream personality-exactness is not
  observable in normal play. The cycle-pricing program is parked at its clean CGB4 v44 checkpoint (6,258-cycle prefix; every receipt
  stands, nothing half-wired). Consequences: live generation may wire the engine's clean back-to-back stream, documented as
  distribution-accurate (same pools, rejection rules, odds), NOT hardware-stream-exact; byte-exact verification continues only
  against captured / adopted seeds (the `anchor-state.json` class); the no-fitted-constants rule still protects the parked
  clock's evidence (`serviceCostMasterCycles` stays null; no fitted clock may pose as the real one).
- **Symptom (still true):** `generateInitialFactoryRentals`'s single `constructionRngValue` consumes draws back-to-back, but on
  hardware `CreateFrontierFactorySelectableMons` spans 53 video frames for the anchor draft and `VBlankIntr`'s ambient `Random()`
  (`main.c:366`) interleaves into the same `gRngValue` stream. Two-cursor replay of the probed anchor cursors reproduces slots 0/2
  but diverges on slots 1/3/4/5 (first: MAGBY expected `1534575931`, got `431990256`). The terminal scaffold sidesteps this by
  adoption, not by fixing the contract (`docs/anchor-draft-cursor-receipt.md`).
- **Resume only on a user decision:** the construction clock needs live phase / workload composition and complete VBlank / IRQ /
  audio arbitration (`runFactoryConstructionClock` is unwired).

## #39 — `battleScene.ts` is a state machine over one canonical battle

History (canonical-split batches, dispatcher ladder slices 1-10, cache hardening receipts): `docs/archive/ISSUES-pre-cln238.md` #39.
- **Symptom:** production battle presentation is still partly keyed to which turn of the recorded Battle 1/2 we are in rather than to
  what happened. The turn-keyed *dispatcher* is gone (ladder closed, supervisor-verified 2026-08-08: 0 `BattleSceneState`
  handoff fields); the per-species *render entry points* remain (at the last count `battleScene.ts` was 36,897 lines with 848
  `turn<N>` textual references, none state fields; broad inventory 1,949 matching lines).
- **Open work:** the successor program `docs/species-render-entry-point-retirement-design.md` (45 census'd entry points, 7 slices;
  slices 3-4 ungated) and `docs/battle-scene-retirement-inventory.md`. Both dossiers are partly stale: check each slice's premise before briefing.
- **Canonical split stopped** at its natural boundary (199 symbols depend on battleScene-local shared symbols). Decision (a)
  AUTHORIZED 2026-08-19: canonical -> `battleScene.ts` value imports via re-export, reading the binding only inside function bodies
  (eval-time reads TDZ-crash), each batch proven by `npm run compare:differential` + full `npm test` / build. Decision (b)
  (widening `tests/animation/animationBoundaryRatchet.test.ts` `allowedConsumers`) NOT taken. The ONIX-Sitrus cluster (blocked on
  `sitrus*AtAge` from `../animation/heldItemHeal.ts`) and two `let` caches stay in `battleScene.ts`.
- **Next bounded owner:** `turn10OnixDarkPalette` (module-global palette cache keyed to one source; rename, `WeakMap` by source
  palette array, two-palette both-orders red pin beside `doubleTeamClonePalette`; use the three turn-10 OFF traces as 592-capture
  canaries; never add a staged darken field). Filler priority (user, 2026-08-08).
