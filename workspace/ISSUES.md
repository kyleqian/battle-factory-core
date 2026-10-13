# Issues — standing backlog

Known-open bugs and debts, numbered (numbers are never reused). When you fix
one, **delete the entry** in the same docs commit that records the fix in
`PROGRESS.md` — git keeps the forensic history. Group by area; per entry:
symptom, what's confirmed from the reference/oracle, and any leads.

**Two kinds of entry live here — do not confuse them.** `#39`, `#55`, `#70`,
and `#71` are open, actionable debt. `#38`, `#18`, `#56`, `#61`, and `#5` are
**settled records, not work**: each was investigated to root cause and then
parked or accepted by decision. They stay because ROADMAP acceptance lines
cite them by number as the recorded reason specific pixel diffs are accepted
(`#5` at ROADMAP:127, 142, 150, 163, 175; `#18` at :176; `#38` at :503) —
deleting them would orphan those citations and lose the *why* behind a green
tick. Do not reopen one without a user decision, and do not count them as
backlog.

# Open

**Current scope, user-approved 2026-10-13:** the remaining Factory animation,
presentation and battle-engine accuracy defects are all authorized in the
finish-up mission (`docs/factory-finish-scope.md`). #165 / #141 / #140 / #139
may change gameplay/RNG when proved against source; use main-lane ownership
and gameplay gates. Historical presentation-only exclusions are superseded.
Settled/parked records and unrelated expansions retain their existing status.

## #168 — remainder: a Scene ON status animation over an INVISIBLE battler draws nothing (S10A; #168 otherwise DONE 2026-10-13)

All nine B_ANIM_STATUS_* animations are timed (sa125 + the IsBattleSEPlaying gate, sag130) and drawn (sar131 / sad133 / sae135 / gaf140;
88 + 16 dense ROM windows 0 px; live audit 28 clean). Remaining: when the battler's sprite is hidden but not semi-invulnerable (a Dig
charge turn followed by the battler's own in-love check), the ROM runs the script and draws its sprites (hearts / letter Z) over the
hidden battler; production's guard draws nothing. Census 0..999: 5 / 8,063 commands. Banked patch + proofs: docs/inv142-status-animation-
invisible-battler.md (`tools/integration/fixtures/inv142/inv142-invisible.diff`, 5 / 5 windows 0 px, census identical; landing recipe
there). Also open (D4 class, aud137): FRZ's frozen-turn active rows are 115 vs production's 116 on 4 / 10 windows (next message 1 frame late).

## #167 — remainder: Scene OFF Rest attack pause and unmeasured next receipts (S10A, 2026-10-11)

Landed: olnd113 (OFF no-hit pause per class + the MoveMissedPause / failed / Protect-blocked hold in both scenes), scf117 (post-stats-change
alignment), off121 (OFF `status` command), fix122 (Scene ON no-effect attackanimation hold, 12 classes). Open: Rest's attack receipt after
"went to sleep!" + waitmessage + the status icon gets no OFF pause (ROM att G+128, F_after G+163, HP bar G+166; off108 §1 "Open", off121 §1c);
no-hit bodies whose next receipt is a sprite-visibility (298 census bodies) or a stat-stage-change without STATS_CHANGE (Curse-like paths)
get no OFF pause (unmeasured); the charge-turn EMPTYSTRING3 print is a 24-frame message in production vs 2 ROM rows (off108 notes).

## #165 — GAMEPLAY: the ROM's Factory turns Return into Frustration (friendship 0); production keeps Return (found 2026-10-10 by ret80)

The ROM builds every Factory rental and opponent with `friendship = 0` and writes each move through `SetMonMoveAvoidReturn`
(`reference/pokeemerald/src/battle_factory.c:459-462`, `:501`, `:820-823`, `:913-919`: `MOVE_RETURN` -> `MOVE_FRUSTRATION`), so a Factory
battle never contains Return: the 11 Level-50 sets that list Return (`src/data/gen/battle-frontier-mons.json`: TOGEPI 26, MARILL 28,
CLEFAIRY 107, TOGETIC 288, DRAGONAIR 306, PIDGEOT 355, GYARADOS 459 / 747, EXEGGUTOR 534, FEAROW 567, ...) fight with Frustration
(power (255 - 0) * 10 / 25 = 102). Production has no such mapping (no `AvoidReturn` anywhere in `src/`): those sets keep Return at
friendship 0 (power 1) — different damage, AI scores (Factory AI CheckBadMove treats the two effects differently) and animation. Since ret88
(2026-10-11) production's live Return renders the ROM's ReturnWeak branch (friendship < 61: 88 rows, order key 40216) — what the ROM plays for
production's own friendship-0 Return; ReturnStrongest stays proven for friendship > 200. docs/next-adapters-prep18.md s4's "255 for every Return user" cites
battle_tower.c, which the Factory does not use. Still unfixed; the user authorized this gameplay correction on 2026-10-13
under `docs/factory-finish-scope.md`. The former presentation-only scope blocker is resolved.
Resume (a gameplay-parity step): map Return -> Frustration where the Factory builds battle parties (player rentals and opponents, both
the battle-start and swap paths), check what the draft / swap summary screens show for those sets in the ROM (the screens may read
`gFacilityTrainerMons` directly), re-run the Factory battle / AI / soak gates, then retire or re-scope the live Return adapter and
ret80's / ret88's Return order keys (Frustration's animation is the one that plays). Census 0..999 (2026-10-11): 84 Return commands, all live
as ReturnWeak.

## #161 — Dive attack: an extra lag frame at age 17 on poisoned player-diver routes (S10A, found 2026-10-10 by st76)

docs/st76-status-gates.md: 5 of 34 PSN player-attacker windows run 94 rows (lags [17, 85, 86] instead of [84, 85]); 0 / 73 unstatused,
0 / 29 BRN opponent-attacker. Every displayed image is correct (with the repeated ROM row skipped, 93 / 93 rows 0 px); production presents
the dominant 93-row phase (29 / 34). Mechanism unknown (RAM at activation identical). Resume: name the age-17 lag source from counters,
then record it as a third Dive D4 parameter (docs/faithful-timing-policy.md) or gate the shape.

## #157 — Weather-continuing animations: kernel event battler is the last attacker, the ROM plays them on battler 0 (S10A, found 2026-10-09 by aud56)

The kernel's MOVE / general-animation event for RAIN / HAIL / SANDSTORM_CONTINUES carries the last attacker as its battler; the ROM
plays them on battler 0 in every Factory battle (end-of-turn effects use the first non-absent battler; in singles battler 0 is
never absent there; 32 / 32 probed instances, `tools/integration/fixtures/aud56-net-zero-audit.json`). Harmless for the allocator
(aud56 dropped the side key; a side-keyed draft cost 35 live commands), but a Scene ON renderer that reads the event battler
(pan / position) may draw or pan these on the wrong side. Resume: check the RAIN_CONTINUES / weather renderers' use of the event
battler; if any reads it, take battler 0 at the seam (presentation only) with a dense window on an opponent-set weather.

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

## #153 — Scene OFF skips the Substitute body (kernel attackanimation port vs source; S10A, found 2026-10-07)

Source plays Substitute (and Transform) through `Cmd_attackanimation` even when battle animations are off
(`battle_script_commands.c:1748` exempts them; prep37 measured the 87-row body and the 103-row fade identically under
Scene OFF). The kernel's attackanimation port (`battleScriptHitChainOpcode.ts` ~:2224) takes the no-animation pause
for Substitute instead, so under Scene OFF the doll only appears from the next prompt (presentation timing only; no
logical outcome measured to change). Gameplay-kernel owned: needs a main-lane fix with Scene OFF frame-timing proof.
Evidence: `docs/next-adapters-prep37.md`, `tools/integration/fixtures/subst-live-receipt.json`. Quantified by live audit 26 (2026-10-11,
docs/aud118-live-audit-26.md): 16 census uses; ROM OFF waitanimation 90 rows, HP bar G+98, glyph G+140; production HP bar -57, message -71.

## #152 — Species audits 9-14 remainder: idle-rest attacker class, Extrasensory split rows, Confuse Ray CPU phase, TYRANITAR rows (S10A, 2026-10-07)

Evidence `docs/live-species-audit-9.md`, receipts `tools/integration/fixtures/species-audit-9/`. FIXED in `a7402719b`
(supervisor reran x2 fresh): Mach Punch opponent attacker with an idle rest (ONIX 86,089 -> 0 px, RATTATA 36,222 -> 0)
and the Revenge idle-rest gate narrowed to targets (ONIX / RATTATA attackers 0 px). Open remainder:
- **Mach Punch (183), opponent-side target with an idle rest:** one row (age 60) unexplained after the rest fix; the
  live adapter now DECLINES such targets (fallback view). Resume: RAM-probe the target x2 at ages 58..61.
- **Meteor Mash (309), player-side FLYGON target:** not a production defect — the derived audit fixture's pinned
  Random2 activation is 4 steps late (offset scan: 0 px only at -4, equal to the GOLBAT sibling's value); why the two
  FLYGON probes record 4 extra steps is unexplained. Corrected fixture `fixtures/s10a-part0/meteor-mash-flygon/`.
- **Fixed in `138f79ad4` (audit 10):** the Extrasensory clone now carries the attacker's idle x2 rest (RATTATA 8,009 -> 0 px)
  and the Spit Up idle-rest gate is narrowed to targets (ONIX / RATTATA attackers 0 px; `tests/animation/liveSpeciesAudit10Fixes.test.ts`).
- **Extrasensory opponent-side targets FLYGON / GOLBAT / WAILORD:** 18,345 / 8,318 / 162 px on ages 43..117 in the
  policy phase; likely the documented scanline-split class (prep30 §1.4) but the split line was not measured.
- **Dive (291) setup turn:** length / droplet draw age / row-68 rule FIXED in `08e1c9c4c` (12 audit-11 species 0 px,
  supervisor reran); TYRANITAR attacker keeps 9 px on ages 63..64 (unresolved; Sand Stream intro?).
- **Fixed in `e25fa104c` (2026-10-08):** the Extreme Speed / Dive CLAMPERL CPU-phase cases are D4 policy entries (Extreme
  Speed, Crunch and Psychic reclassified to faithful timing).
- **TYRANITAR rows (Dive 4-9 px, Ice Ball 16 / 63 px, Memento 2,537 px at age 140):** unresolved; lags match.
- **Audit 12 (`docs/live-species-audit-12.md`):** FIXED: Substitute shiny gate (`46319b2d9`); NIDORAN F / M healthbox gender
  symbol, Flatter elevated-opponent gate (#142 row-0 hook), Skill Swap idle-rest gate and its documented other-phase max
  (`2ba4da4a3`). Open: TYRANITAR Flatter 2 / 96 px unresolved.
- **Doll-free controls from prep38 / dolldef (2026-10-08):** Shadow Ball (247) PERSIAN -> SLOWBRO player 304,556 px (rows 69..99 +
  the 156-row tail phase rows 137..152; also in the doll-free control, so a pre-existing Shadow Ball limit for that pair);
  Psychic opponent HAUNTER -> KADABRA 200 px on the pre-activation row (elevated attacker shadow); Quick Attack player
  (5,601 px inside the doll box) and Double-Edge player after an earlier Double-Edge (480 px) unresolved
  (`docs/next-adapters-prep38.md`, `tools/integration/fixtures/dolldef-live-receipt.json`).
- **Audit 13 (`docs/live-species-audit-13.md`, 2026-10-08):** FIXED in `e25fa104c`: Ice Beam / Thunderbolt / Sludge (Bomb)
  opponent idle-rest attacker, shiny swap decline, Crunch / Psychic D4; Ice Ball resting target was already declined. Open:
  ONIX attacker 1,091 px/row before its first move (Body Slam / Brick Break / Flamethrower / Attract, doll-free too); 15
  candidate renderers from the static attacker-rest scan (`a13fix-live-receipt.json`), unproven.
- **Substitute fade (2026-10-08, `fade-live-receipt.json`):** the ROM shows a frozen message-box wait cursor on the fade rows
  after the "took damage" message, which production presents as an automatic (cursorless) message — 37 px / row; the
  fade's claim is scoped outside that footprint (message-host question). Not measured: the ROM wait between that message
  and the fade, fades on a non-target (recoil), multi-hit or Baton Pass / switch fades, Scene OFF within the Substitute's
  own resolution (#153).
- **Audit 14 (`docs/live-species-audit-14.md`, 2026-10-08):** FIXED in `2ba4da4a3`: fade row-0 shadow, Confuse Ray / Bite
  idle-rest opponent attacker; the Confuse Ray CPU phase is a D4 policy entry since `7993b02fd` (d4tails). Open: Double-Edge row 33
  with an idle-rest opponent attacker (410 / 1,091 px), Attract GOLBAT one full-field row.
- **Blizzard (59) opponent impact-start ages 194..206: FIXED in `bb0415c82` (lsbz).** The ARBOK -> CATERPIE static 133-px residual
  was a FIXTURE artifact (audit 16): the geoice control fixture's `fieldProfile` says full HP, the ROM has CATERPIE 24/120 and ARBOK
  161/167 at activation; at the ROM's HP Blizzard / Swift / Thunderbolt are 0 px. Fix: take the HP from the ROM in
  `tools/integration/fixtures/geoice/controls/blizzard-opponent-arbok-caterpie.json` (fixture only).
- **Light Screen (113) opponent row 59: FIXED in `bb0415c82` (lsbz)** — D4 entry with the dominant no-hold phase; the hold windows
  (SNORLAX / CHANSEY first body, EXEGGCUTE / ONIX after Tackle) are the documented other phase (row 59, 2,658 px). Open (audit 16): the
  PLAYER side also shows the hold phase (5 of 20 windows, 2,473 / 2,571 px on row 59) and a second buffered step at row 19 (after PRZ;
  after CONFUSION + a held-item animation on the opponent side, rows 19 + 59, 5,343 px); dominant direct on both sides (15/20, 10/14), so
  the policy renders the right phase, but the player-side and row-19 alternates are not yet documented in the D4 entry.
- Harness limit: the verifier passes only the attacker's personality, so shiny TARGET declines are unverified.

## #148 — Battler x2 history: unknown-history remainder (main bug FIXED 2026-10-06)

- **Fixed:** `src/engine/liveBattlerX2History.ts` (merged `de0e887`-era master) tracks per battler
  idle | zeroed | unknown from the measured per-move/role table (`docs/x2-history-148.md`), resets on
  send-in, and feeds `liveBattlerAnchors(...).frontIdleRest` + every renderer species-rest read.
  Flail bodies 2-5, Double Kick hit 2, Spike Cannon / Fury Swipes later hits, Flail after an ONIX
  send-in: 0 px (receipt `tools/integration/fixtures/x2-history-tracker-receipt.json`).
- **Open:** `unknown` (falls back to the species rest = pre-fix behaviour) after the four `mixed`
  moves (move-0 status bodies, Razor Wind 13, Return 216, Dive 291), after unmodelled general/status
  animations, a party menu or an undrained resolution; the forced switch-in phase does not advance the
  host (catches up at the next command). Only opponent ONIX / RATTATA are affected.

## #147 — Elevated opponents in ordinary resolution frames: remainder (main bug FIXED 2026-10-05)

- **Fixed (merge `b0818de83`):** ordinary resolution frames (both scene modes) draw elevated
  opponents at the elevated origin with their shadow; post-body shadow hide table for live
  bodies whose script outlives the window (d > 0); faint sink from the elevated origin, shadow
  hidden at HP 0. Scene OFF GOLBAT / BUTTERFREE 0/935 -> 919/935; 203 committed traces unchanged.
- **Open remainder:** the 16 hit-blink frames per body (sprite + shadow hidden 4 on / 4 off) are
  not modelled for elevated opponents; the HP-0 shadow boundary uses the displayed HP (may be one
  frame early vs the party-HP write); Sky Uppercut with a COMBUSKEN attacker measured d = 0 vs the
  table's 1; Dream Eater / Sleep Talk swaps not harness-staged (table from the ROM d values only).

## #146 — Forced switch-out and send-in presentation timing differ from the ROM (S10A, found 2026-10-05)

- **Evidence:** `docs/forced-switch-continuation.md` (ROM probes twice fresh; production rendered
  per frame on four Roar/Whirlwind routes; supervisor reran the production render).
- **Forced switch-out (`returntoball`, Roar / Whirlwind / Baton Pass):** the ROM removes the
  battler instantly (`Cmd_returntoball` skipAnim TRUE, `battle_script_commands.c:5346`;
  `OpponentHandleReturnMonToBall` destroy branch): sprite + healthbox hidden at E+4, send-in at
  E+10. Production emits the 32-frame voluntary `switch-out` (recall scale-up frames 0-26, target
  drawn at rest), hides at +27/+32 and starts the send-in at +33
  (`battleResolutionPresentation.ts:3496-3535`). Scene ON blocks live Roar/Whirlwind bodies (the
  recall would redraw the slid-off target). Scene OFF: the ROM continuation is identical in OFF;
  production OFF has the same recall chain (removal -> ball-open 51 frames vs ROM 24; the older
  `docs/issue84-whirlwind-opponent-recall.md` claim "with animation enabled" contradicts the
  source) — no OFF pixel compare yet.
- **Send-in tail timing (all send-ins):** opponent healthbox slide starts send-in +70..+234 and
  the message +96..+260 depending on the species' front animation (339 Factory species swept);
  production uses a fixed 91+11-frame span calibrated on RATTATA (slide +33, message +102).
  Player side: slide constant (+65 vs +66), message +101..+210 (cry overlap).
- **Scene ON forced switch-out FIXED 2026-10-05 (merge of `634207ed8`):** no recall, hold 4 +
  hide 6, send-in at the framebuffer E+11 (ROM E+4/E+10 are RAM writes, shown one frame later);
  tracker `forced-switch-out` + side-generic switch-in units. Player-attacker Roar/Whirlwind exact
  from body start through the emerge (128/128, 112/112).
- **Open remainder:** (1) the send-in tail after a forced switch: production runs the ball-open
  white fade + particles only for a voluntary switch (`sourceDecision.kind === "switch"`), then the
  species-keyed healthbox slide / message above; (2) opponent-attacker Roar: the player-side ball
  throw path differs from k=13 (6,718 px); (3) after any live body by an ELEVATED opponent attacker
  (BUTTERFREE Whirlwind) the ordinary field drawing differs from the body's last frame by 1,444 px
  (pre-existing, likely affects other live moves; untriaged); (4) Scene OFF forced switch-out is
  still the recall chain (no OFF pixel compare yet); (5) Baton Pass (same opcode on the attacker)
  unchanged.

## #145 — Live-adapter species audit: residual remainder (S10A; 7 defects FIXED 2026-10-05)

- **Fixed today:** Leaf Blade (#144), Dragon Rage fire-spit aim, Aerial Ace settled x, Rock Throw
  idle x2, Smelling Salt y clamp, Light Screen / Future Sight end-of-body shadow return, Foresight
  glass translation (merges of `5b7a1ff3b`, `48a1bd913`; audits `docs/live-species-audit{,-2}.md`).
- **Rollout (205, live since 2026-10-05; `docs/rollout-curl-diagnosis.md`):** the hit-splat centre
  is hard-coded to ONIX's (`src/animation/rollout.ts:175-177`, y 42; BLISSEY 46) — a few px for 10
  ages against targets with a different pic y; the shake amplitude is keyed by counter
  (`:209`) while the ROM uses `gAnimMovePower / 12` clamped 1..16 (`battle_anim_mon_movement.c:973-984`),
  so Defense Curl bodies decline today. Fix shape in the doc (centre from the target anchors,
  shake from request power, drop the two declines, regenerate the Scene-ON Curl fixtures).
- **Not defects:** one-frame-later tail fades are species-keyed lag frames (CPU load past VBlank).
- **Open remainder:** Aerial Ace with a player-side GOLEM 1 px at ages 10-11; Spider Web ARIADOS
  back sprite 1 px; Sky Uppercut COMBUSKEN script one frame longer; Blizzard / Icy Wind fall back
  for the elevated pair by design (retained OAM-order proof only for non-elevated pairs); Dragon
  Rage with non-CHARMELEON player attackers formula-derived, unmeasured; Quick Attack / Mud Slap
  `+1` literal not swap-checked; GOLEM swaps exist only for Rock Throw and Foresight among the
  audit-2 fixes.

## #143 — CASTFORM non-normal forms (weather) are not modelled (S10A; normal-form residual FIXED 2026-10-05)

- **Fixed (`55d1ef1dd`):** the normal-form Y placement (player back delta 0 from
  `sCastformBackSpriteYCoords`, opponent elevation 13 from `sCastformElevations`;
  `docs/castform-art-diagnosis.md`); retained ROM runs now 237/237 exact both sides.
- **Live claim (cf78, 2026-10-10; was ISSUES #162):** every live body declines while a CASTFORM is shown in a weather form
  (presentation-only per-slot form from the CASTFORM_CHANGE argument; live audit 19 had found 44 live windows drawing the normal form);
  the fallback draws the same normal-form pixels until the per-form art below lands, then the decline can lift.
- **Per-form art LANDED (cast83, 2026-10-10 night; qa91 +3 keys):** form frame, castformPalette[form], front coords, elevation and
  back Y per form in the field view and the live renderer; 32 (move, Castform role, form) keys ROM-proven live
  (`LIVE_CASTFORM_FORM_PROVEN`). **Open remainder:** unmeasured keys keep declining (census 0..999: ~15 commands — Ember / Rain Dance /
  Fly / Ice Ball / Scary Face / Rest in other forms); rain Icy Wind is a TIMING-PHASE (lag ages [241, 242] vs [261], also without Castform:
  a D4 candidate); the Substitute-swap composite still declines with a form shown; the latent front coords width (source 32 vs app 24,
  `battle_anim_mons.c:2253-2255`) for width-dependent moves is unexercised.

## #141 — Two `SetMoveEffect` exits must RE-RUN `seteffectwithchance` (which then wastes one `Random() % 100`): the THRASH lock-in `break`s without advancing the cursor, and Thief/Covet-vs-Sticky-Hold uses `BattleScriptPushCursor()` — the port `advance`s / `"call"`s instead (RNG-affecting)

**Found 2026-08-26** (move-effect application audit,
`docs/move-effect-application-audit-2026-08-26.md` §4 rows S13/S21 + Findings 1-2; supervisor-verified
at source and port). Mechanism, `battle_script_commands.c` `Cmd_seteffectwithchance` (`:2908-2937`):
`else if (Random() % 100 < percentChance && gBattleCommunication[MOVE_EFFECT_BYTE] && !(gMoveResultFlags & MOVE_RESULT_NO_EFFECT))`
— the draw is the FIRST conjunct, so when the opcode executes with the byte already 0 (cleared by
`SetMoveEffect`'s tail `:2905` and by `:2937`) it still spends one `Random()` and then `gBattlescriptCurrInstr++`.
The opcode re-executes in exactly two singles-reachable situations, and the port models neither:

1. **THRASH / OUTRAGE / PETAL DANCE lock-in** — `SetMoveEffect` `case MOVE_EFFECT_THRASH` (`:2851-2862`): the
   not-yet-locked branch writes `STATUS2_MULTIPLETURNS`, `gLockedMoves[]`, `STATUS2_LOCK_CONFUSE_TURN((Random() & 1) + 2)`
   and `break`s WITHOUT touching `gBattlescriptCurrInstr` (the only family-B case that does so); the tail only
   clears the byte, `Cmd_seteffectwithchance` does not increment either → the cursor still points at
   `seteffectwithchance` → re-run → one wasted draw. Entry path (verified): `BattleScript_EffectRampage` →
   `confuseifrepeatingattackends` (sets `THRASH | AFFECTS_USER`) → `BattleScript_HitFromCritCalc` … `seteffectwithchance`
   (chance 100). Port `battleScriptHitChainOpcode.ts:3917-3921` (`applyThrashMoveEffect`) returns `{ kind: "advance" }`.
   ROM draw order on the lock-in turn: chance roll, `(Random() & 1) + 2` duration, **wasted chance roll**; port stops
   after the duration draw. Carriers: Thrash 2, Outrage 2, Petal Dance 5 rental entries.
2. **Thief/Covet into Sticky Hold** — `case MOVE_EFFECT_STEAL_ITEM` (`:2767-2775`): `BattleScriptPushCursor()` pushes
   the CURRENT cursor (`battle_util.c:966-969`), then `BattleScript_NoItemSteal` (`battle_scripts_1.s:4209-4213`,
   ends in `return`) → the opcode re-runs → one wasted draw. Port `battleScriptHitChainOpcode.ts:3122-3138` uses
   `{ kind: "call", programCounter }` (returns to the NEXT opcode; `battleScriptMachine.ts:998-1009`) although the
   machine already offers `"call-current"` (`:1010-1021`). Under `BATTLE_TYPE_FRONTIER` the two "regular battle"
   arms short-circuit, so the Sticky Hold arm is reached whenever the target holds a non-Enigma/mail item.

The port's own `seteffectwithchance` handler already draws unconditionally before testing the byte
(`battleScriptHitChainOpcode.ts` `drawBattleScriptRng(…, "seteffectwithchance")` then `rolledSuccess && moveEffectByte !== 0`),
so the fix is purely the two transition kinds: THRASH → leave the cursor on the opcode (re-run), Sticky Hold →
`"call-current"`. **Consequence:** every later draw in the battle is offset by one (next turn's damage/crit/
secondary rolls, `gRandomTurnNumber`) — no message differs. **Receipt recipes** (`mechanicLab` `overrides.parties`,
Battle Scene OFF, frame 0 = turn-1 action menu, A pulses past prompts): (1) player slot 0 = a Thrash/Outrage/Petal
Dance carrier, opponent = a bulky mon with one move ×4; window turns 1-3 and count the turn-1 draws attributed to
`seteffectwithchance` (ROM 2, port 1) — the turn-2 damage roll differs; (2) player slot 0 = LINOONE with COVET,
opponent = GULPIN/SWALOT with `abilitySlot` = Sticky Hold holding a plain item, one move ×4; window turn 2+ and compare
the draw count / next damage roll. Fix both sites in one step, pin each with the receipt's draw counts, re-pin moved
curated-seed trajectories with attribution, and rerun all five gates (the vanilla canary trajectory will move).

## #139 — The `CheckFocusPunch_ClearVarsBeforeTurnStarts` pre-pass ("…is tightening its focus!" before ANY action) has no port site

**Found 2026-08-26** (turn-machinery audit §3 row 3.20 / Finding 2; supervisor-verified that
`grep -rn focusPunchBattlerId src/` is empty). Source `battle_main.c:4906-4923`: after turn order
is fixed and before `RunTurnActionsFunctions`, the engine walks `gBattleStruct->focusPunchBattlerId`
in battler-index order and, for each battler with `gChosenMoveByBattler == MOVE_FOCUS_PUNCH` that
is not asleep, not Truant-loafing and not `noValidMoves`, runs
`BattleScriptExecute(BattleScript_FocusPunchSetUp)` (`printstring STRINGID_EMPTYSTRING3` /
`waitmessage 1` / `playanimation B_ANIM_FOCUS_PUNCH_SETUP` / `printstring
STRINGID_PKMNTIGHTENINGFOCUS` / `waitmessage B_WAIT_TIME_LONG` / `end2`). The same function's
`TryClearRageAndFuryCutter` half is separately verdicted (Rage: 0 carriers). Port:
`factoryBattleScriptFullTurnDecision.ts:3013-3030` goes straight from turn order to action 1;
`battleScriptStatbuffchangeOpcode.ts:257-268` only registers the animation id.

**Consequence:** message/event ORDER only (no RNG): the ROM shows the extra message box before
either battler's action, even when the Focus Punch user is slower; every later message in the
turn shifts by one box in the Scene-OFF captures. 11 of 882 rental entries carry Focus Punch.

**Receipt recipe:** player slot 0 = a Focus Punch carrier (Speed 0), opponent = max-Speed mon with
one harmless `MOVE_TARGET_SELECTED` attack ×4; turn 1 select Focus Punch and capture from the action
menu through the first message box (ROM: "tightening its focus" first, then the opponent's faster
move); control = the same fixture with another move selected. Fix shape: emit the pre-pass as its
own end2 script event between turn-order fixing and action 1, in battler-index order.

## #140 — [FIXED 2026-08-26 except one branch] `HandleAction_UseMove:133` (chosen slot overwritten by Mimic/Transform) still skips `GetMoveTarget`'s `MOVE_TARGET_SELECTED` draw loop

**Remainder of #140** (the forced-Struggle `:105`, Encore-match `:117` and overwritten-Encore
`:128` branches were fixed with a stock-ROM receipt on 2026-08-26: `9c886479`/`3361e0c4`/`a3a5642e`,
`tools/probe/receipts/issue140-getmovetarget-off.json` — Encore/Struggle-forced actions draw
1/2/1/1/3 `Random()`s on the ROM, ordinary prologues 0; port now runs the modeled do/while via
`drawBattleScriptSelectedMoveTarget`, Follow Me short-circuit honoured). The fourth source branch,
`battle_util.c:133` — `gBattleMons[].moves[gCurrMovePos] != gChosenMoveByBattler[]` after Mimic or
Transform overwrote the chosen slot — needs the selection-time bank `gChosenMoveByBattler`, which
`factoryBattleScriptFullTurnDecision.ts`'s action reducer does not model (`actionMoveId` reads the
live slot); named in `drawActionMoveTarget`'s docstring, not silently folded. Carriers: Mimic 2,
Transform 1 rental entries. Port it by banking the chosen move id at selection and comparing at
action time (same draw loop), with a Tier-1 pin; a receipt needs a Mimic/Transform fixture.

## #121 — [PROBED 2026-08-22: NOT a divergence] `AI_monToSwitchIntoId` / `monToSwitchIntoId` are a dormant coupled pair

`docs/issue121-ai-mon-to-switch-into-probe.md` closes the reachability
question: the banked id is consumed and reset during action selection
(`battle_controller_opponent.c:1668-1669`), every `openpartyscreen` runs
during turn execution, and `Cmd_openpartyscreen` clears
`monToSwitchIntoId` before its emit (`battle_script_commands.c:5117`), so
`battleScriptOpenPartyScreenOpcode.ts`'s unconditional scorer call (#110)
is source-exact everywhere reachable. **Only this stays open, as dormant
debt:** the engine omits BOTH the `:5117` clear and
`GetMostSuitableMonToSwitchInto`'s `:646-647` early return
(`battleAiSwitchInto.ts`), and the two omissions cancel exactly — port
them together or not at all; porting either alone introduces the
divergence the probe ruled out. **Lead added 2026-08-25 (premise-throw
audit §4 item 1, supervisor-verified):** the source has two MORE lifecycle
writes on the same cell — `HandleAction_ActionFinished` resets
`*(gBattleStruct->monToSwitchIntoId + battler) = PARTY_SIZE` after every
action, and the turn-start loop at `battle_main.c:4008-4009` resets all four
— while the port's `Cmd_switchhandleorder`/`Cmd_getswitchedmondata`
(`battleScriptSwitchinOpcode.ts:347`/`:387`) `throw` on the `PARTY_SIZE`
sentinel that the C simply overwrites from `gBattleBufferB`
(`battle_script_commands.c:5183-5191`) and reads unguarded (`:4606-4619`).
Dormant today only because the port's own sequencing never lets the sentinel
reach those opcodes; if this pair is ever ported, port all four lifecycle
events and drop the two premise throws in the same step.

## #109 — `battleAiSwitchInto.ts` omits the `i != monToSwitchIntoId[battlerIn1/2]` exclusion in both passes

**Found 2026-08-22** (side worker, #102 fix). Source `GetMostSuitableMonToSwitchInto`
(`battle_ai_switch_items.c`) skips a party slot already chosen for the other
active battler in both its scoring passes; the port (`:702-703`, `:757-760`)
does not. Unobservable in singles today because that slot is PARTY_SIZE at
the only call site (one opponent battler), so this is an unmodelled source
condition rather than a live bug — port it when doubles or a second consumer
arrive, with a Tier-1 pin.

## #114 — `runFutureAttacksAfterFaints` fires a delayed hit inline and keeps looping where source returns per effect (doubles-era divergence)

**Found 2026-08-22** (side worker, #102 end-turn cursor fix `a6deb814`). Source
`HandleWishPerishSongOnTurnEnd` (`battle_util.c:1785-1888`) `return TRUE`s after
each Future Sight/Perish Song script and re-enters via `BattleTurnPassed`,
so a second delayed KO in the same turn takes its own `HandleFaintedMonActions`
round-trip; the port runs the remaining battlers inline. Equivalent now that
the `wishPerishSongState`/`wishPerishSongBattlerId` cursor persists
(`tests/endTurnResumeCursorIssue102.test.ts`), and unreachable in singles
(one delayed hit per side per turn) — pin it when doubles arrive.

## #71 — Send-out intro animations: banked front reducers are not wired into the live send-out seam; main-lane share of the dispatcher work

**User decision (2026-08-10): the playable path stays FAITHFUL — no
intro-animation divergence.** The user was offered a browser-only
divergence (play the banked intros in the playable build, gated off in all
oracle comparisons) and declined: Battle Scene OFF genuinely skips send-out
intros (this entry's Slice-D record, four independent sources), so the
current no-intro behavior is correct and stays. Consequence: this issue's
remainder — the §1e 56/58 move-window patch-site retirement and the
KABUTO/MAGBY/ONIX hand-fit retirements — is internal code health at
**filler priority**. Do not wire per-tick playback or terminal offsets into
any OFF-profile seam; that half is settled twice over (Slice A refuted +
removed, Slice D not-applicable).

**Symptom:** all 62 Factory-front send-out intro families (**376/376** species
mappings) are ported and accepted in the animation lane
(ANIMATION_PROGRESS.md top entry, 2026-08-03, `ANIM_FRONT_FLIP` closing the
census), but the live battle send-out seam never invokes these reducers
frame-by-frame — playable battles show no per-species intro animation, and
every settled sprite misses its function's terminal `x2`/`y2` rest offset
**for the remainder of the battle**. That residual-offset leak is the defect
class behind the user's 2026-07-31 priority directive; two windows already
hand-paid for it (DRAGON_RAGE's dense window and
`docs/aerial-ace-portable-staging-probe.md`, both settled opponent-front ONIX
at `x2=+1`).

**Confirmed:** rung 1 of `docs/send-out-intro-animation-program.md` §6 is done
(`src/data/gen/send-out-anim-selector-tables.json`); the front family is fully
banked as reducers with byte-identical mGBA receipts (62/62), superseding
rung 2's tier-1 constants for front. Three hand-fit one-offs exist today with
no dispatcher: ONIX front terminal (`src/animation/speciesIdleAnim.ts:44`),
MAGBY back (`src/engine/magbySendOut.ts:18`), ONIX back
(`src/engine/battleMenu.ts:708`). The latter two live in main-lane-owned
`src/engine/` files — retiring them is a coordinated cross-lane change, not an
animation-lane drive-by (program doc §6 rung 3).

**The work — main-lane share:** (1) invoke the rung-3 dispatcher (animation
lane builds it in `src/animation/`, keyed by species for front and
species+nature for back) from the live send-out seam so banked reducers run
frame-by-frame — or at minimum apply their terminal rest offsets so settled
sprites sit at source-exact positions; (2) retire the two `src/engine/`
hand-fits into that dispatcher, coordinated with the animation lane.
Back-family tier-1 constants (68 reachable functions, rung 4) are the
animation lane's next program and are **not** a prerequisite for wiring the
completed front family. Acceptance bar: program doc §7 — RAM probe of the
settled sprite (`gBattlerSpriteIds[n]` `x2`/`y2`/`animNum`/`callback`), dense
oracle window twice fresh, and a sibling-species spot-check per promoted
function.

**Slice A is REFUTED under Battle Scene OFF (2026-08-07, staged + RAM-probed,
supervisor-verified).** The "at minimum apply their terminal rest offsets"
half of item (1) above must **not** be implemented on the OFF profile. A
side-lane worker staged a legal Level-50 RATTATA send-out through
`mechanicLab overrides.parties`
(`tools/battle-lab/send-out-slice-a-rattata-off.json`, two `bin/oracle lab`
runs byte-identical across 2036 files) and probed the settled sprite every
tick (`docs/send-out-slice-a-positive-case.md`,
`tools/probe/dump-sendout-slice-a-rattata.py`, receipt 2640 tick rows):
the sprite is created already at `SpriteCallbackDummy` with `animNum 0` and
**`x2 = y2 = 0`**, and stays there for the whole battle (all 634 post ticks,
zero deviations) — OFF takes the `SKIP_FRONT_ANIM` path (`pokemon.c:6803`)
and never launches the animation task the terminal offset belongs to.
The banked table nonetheless returns `{x2:1, y2:0}` for RATTATA and ONIX
(`speciesFrontIdleRestOffset`), so wiring it at the settle hooks would have
been a **361-px regression** over bbox (164,41)-(190,71), not an inert no-op.
Independently corroborated: `mid-battle-switch-dense-a-off` is byte-exact
with a settled RATTATA opponent front sprite on screen. Consequence: the
front terminal-offset wiring is **ON-profile-only** work, and the main lane
(whose oracle is OFF) has nothing to hook up for it. Slice C of
`docs/send-out-live-wiring-consumer-map.md` §5 (guarding the `src/engine/`
back hand-fits so an uncovered species/nature fails loudly instead of
silently drawing the wrong table) was already DONE below (entries 891,
894/895) by the time this paragraph was written — re-verified still green
2026-08-22 (main worker, all three guard/fallback sites re-read + their
Tier-1 pins re-run: `tests/battleScene.test.ts` 306/306,
`tests/generatedPlayerMaterializeSettleSpecies.test.ts` 7/7). Per-tick
playback (Slice D) is likewise ON-profile behaviour: OFF skips front and
back send-out animations entirely.

**Sequencing (updated 2026-08-03, mid-session user directive):** the hookup
is the MAIN lane's job ("the animation supervisor works on implementing the
animations... it should be your job to hook those things up"). Ground truth
for scoping: `docs/send-out-live-wiring-consumer-map.md` (2026-08-03 scout,
base `4fe0e206`) — 4-slice plan §5, the 5 settle hooks §4, RAM-probe recipe,
cross-lane dispatcher ask. Supervisor-verified scout finding: of 386
species only ONIX and RATTATA have a nonzero terminal rest offset (both
`{x2:1,y2:0}`). The scout also found a **4th uncatalogued hand-fit**
(KABUTO live per-tick front animation, `src/engine/kabutoSendOut.ts`) and
corrected the ONIX-back citation drift (`battleMenu.ts:708` → `:733-749`).
Resolver side is ready — `battleIntroStrings.ts` + entry 887's
`introBattler`/`introHpScale`/`introOutcome` event fields mean the send-out
strings resolve the moment a live path emits them.

**Progress (2026-08-03, entry 890): Slices A+B DONE.** `speciesFrontIdleRestOffset`
is now wired at all 5 real settle hooks (§4 items 1-5, 6 call sites) in
`battleScene.ts`; the generated-route pair already threaded the real
`fieldView` species (Slice B satisfied as written). RAM-probe-confirmed
against the real ROM for GROVYLE/PIDGEOTTO (sibling pair, both `{0,0}`) and
RATTATA (positive case, `{1,0}`) — see `PROGRESS.md` entry 890 for the
probe/scenario details and the `battle-scene-off`-vs-`battle-scene-on`
mechanicLab fast-forward gotcha it turned up. Dense-window list re-run twice
fresh, zero new diffs; `battle-command-generated-off.json` 128/128
byte-identical vs. parent.

**Progress (2026-08-03, entry 891): Slice C DONE.** The 3 back-side hand-fit
consumers (`drawPlayerMaterializeSettle` ONIX-back-legacy,
`drawKabutoHSlideWobble` KABUTO-front-legacy — the §2 4th hand-fit — and
`drawTurn15ForcedSwitchRelease` MAGBY-back-forced-switch) are documented +
throw-guarded per §5 Slice C, each with a Tier-1 pin.

**Progress (2026-08-03, entry 894/895): entry-891's latent bug FIXED**
(`7e14afae`, merged `cffb7491`): `drawGeneratedPlayerMaterialize` now applies
the ONIX-only `playerMaterializeSettleY2` wobble table only when the generated
player lead is ONIX (species 95 + symbol double-gate,
`generatedPlayerMaterializeSettleY2`); the tint fade stays for every species
(RAM-probe-confirmed species-generic, `Task_FadeMon_ToNormal` 16→0 −1/tick).
Ground truth banked from a real-ROM KADABRA-lead probe
(`docs/probes/kadabra-materialize-settle/`): each species' true settle is its
own back-anim-family motion (KADABRA: y2 descent 14→0 over 13 ticks), so
non-ONIX draws flat y2=0 **until Slice D's dispatcher lands** — the descent
itself is deliberately un-modeled here. 7 red-verified tests
(`tests/generatedPlayerMaterializeSettleSpecies.test.ts`); differential
128/128 byte-identical (supervisor-rerun); full suite green at the commit.
Open remainder from that step: the oracle-pixel compare over a staged
non-ONIX settle window was NOT completed (matched app/oracle fixture-pair
authoring cost + suspected oracle single-frame nondeterminism under
multi-lane load — see PAPERCUTS); fold that check into Slice D's acceptance.

**Slice D — NOT APPLICABLE for the main lane's oracle (found 2026-08-04, R3
worker, before writing any render code, no src edits landed).** The rung-3
dispatcher itself landed (`src/animation/sendOutDispatcher.ts` +
`sendOutSpriteFrame.ts`, folded into master `519b6bf8`), but wiring its
per-tick playback into `drawGeneratedOpponentRelease`/
`renderGeneratedBattleStartPlayerRelease` — the main lane's **Battle Scene
OFF** seam — would be wrong, not a stretch improvement. Four independent,
converging sources all agree the real Scene-OFF game never plays this
animation at all:

1. `bin/oracle info`'s own bootstrap description (battle-scene-off profile):
   *"Move/effect and species front-sprite entrance animations are skipped by
   the real game."* Contrast `--profile battle-scene-on`: *"in-battle,
   move/effect and front-sprite entrance animations play."*
2. Source (`reference/pokeemerald/src/pokemon.c:6803-6852`,
   `DoMonFrontSpriteAnimation`): under `HITMARKER_NO_ANIMATIONS` (set once at
   battle init from `gSaveBlock2Ptr->optionsBattleSceneOff` and never cleared
   mid-battle, `battle_main.c:3081-3090`), the `SKIP_FRONT_ANIM` branch runs —
   `LaunchAnimationTaskForFrontSprite` is never called, `sprite->callback =
   SpriteCallbackDummy`, `x2`/`y2`/`animNum` stay at their pre-callback values
   forever. This is the exact callback (`SpriteCB_OpponentMonFromBall`,
   installed at the same `StartSpriteAffineAnim(..., BATTLER_AFFINE_EMERGE)`
   handoff `drawGeneratedOpponentRelease` already models) `frontSendOutFrameAtTick`
   is meant to feed.
3. `drawGeneratedOpponentRelease`'s own pre-existing doc comment
   (`battleScene.ts`, predates this session) already says so verbatim:
   *"Battle Scene OFF skips the later species front-animation callback."*
4. `ISSUES.md` #56's closure audit (settled 2026-08-03) found **every**
   residual frame in the two committed generated-route dense Scene-OFF
   windows (`factory-arbitrary-intro-yoshi-off` 700/751,
   `-magneton-off` 703/751) accounted for by two unrelated mechanisms
   (display-tail VBlank phase + idle-menu-bounce) — zero residual from
   front-sprite movement, despite YOSHI/COMBUSKEN's real `ANIM_V_JUMPS_H_JUMPS`
   family, which would show visible mid-flight displacement if it played.

`PAPERCUTS.md`'s "mechanicLab send-out fast-forward silently inert under
battle-scene-off" entry asserts the opposite ("Real OFF-profile battles DO
play send-out anims") — that claim is **incorrect**, contradicted by all four
sources above; a solo session should correct/retract it (supervised workers
don't edit `PAPERCUTS.md`). The already-landed Slice A (applying
`speciesFrontIdleRestOffset`'s static terminal offset at `coeff===0`) is a
separate, already-merged decision outside this step's scope to re-litigate,
but the same source facts arguably bear on it too (`SKIP_FRONT_ANIM` never
runs the animation task at all, so a real Scene-OFF sprite's `x2`/`y2` may
never leave `{0,0}` even for ONIX/RATTATA at this exact seam) — flagged here
for whoever next touches this code, not fixed in this entry.

**Conclusion:** the cross-lane ask (`frontSendOutFrameAtTick` +
`frontSendOutSpriteFrameAtTick`) is fully delivered and correct on the
animation lane's own terms, but has **no valid consumer in the main lane's
Battle-Scene-OFF-compared render seams** — every seam Slice D would touch is
gated off by the same real-game mechanism. Nothing to wire; Slice D is
closed as not-applicable rather than done or blocked. The §1e 56/58
move-window patch-site retirement (separate, larger pair-guard-refactor
effort, `docs/send-out-live-wiring-consumer-map.md` §1e) remains the only
open main-lane share of this issue, alongside the KABUTO/MAGBY/ONIX one-off
hand-fit retirements (coordinated follow-up, not a solo drive-by).

**Addendum (2026-08-04, R4 MAIN worker): the flagged Slice-A landmine above
is REMOVED.** This entry's own §-above paragraph flagged that Slice A's
`speciesFrontIdleRestOffset` application at the two generated-route settle
hooks (`drawGeneratedOpponentRelease`'s `coeff===0` branch +
`renderGeneratedBattleStartPlayerRelease`'s duplicate) rests on the same
`SKIP_FRONT_ANIM` mechanism this Slice-D record just proved never runs
under Scene OFF — meaning those two hooks were baking a nonzero ONIX/RATTATA
`{+1,0}` the real OFF game never shows. Removed at both call sites
(`54979bf3`); replaced with a one-line comment citing this record. The
staged RATTATA positive pin in `tests/battleScene.test.ts` (ISSUES #71
Slice A/B describe block) is flipped to pin `{0,0}` at the generated
settle, red-verified (the old `+1` behavior fails the new pin with the src
edit stashed). Positive oracle evidence: a `battle-scene-off` mechanicLab
clone of `send-out-front-idle-rattata.json` (RATTATA lead, the census's
only non-ONIX nonzero species), RAM-probed across the full 634-tick trace —
flat `x2=0`/`y2=0`/`animNum=0`/`SpriteCallbackDummy` for all 635 sampled
ticks, receipt in `docs/rattata-off-seam-flat-settle-probe.md`. Insurance:
`compare:differential -- battle-command-generated-off.json --base 1a12ce9c`
stays 128/128 (ONIX/RATTATA appear in no committed generated window, so the
removal is pixel-inert there); the entry-890 §4 dense-window list was
re-run once — 4 of 6 match their documented baseline exactly
(`battle2-kabuto-sendout-dense` 151/151, `battle2-player-sendout-dense`
170/170, `sendout` 255/256, `battle2-jenson-sendout-text` 39/39); the
remaining 2 (`factory-arbitrary-intro-yoshi-off`,
`factory-arbitrary-intro-magneton-off`) show a 1-frame drift from their
documented baseline that **pre-dates this step** (reproduced identically at
the pre-edit commit `1a12ce9c` in a scratch worktree, and
`compare:differential` shows this step's commit is 751/751 byte-identical
to base for both traces at every frame) — filed separately as **ISSUES
#74**, not this entry's concern.

The four canonical hooks (`drawGrovyleSettled`, `drawKabutoHSlideWobble`'s
settle branch, `drawTurn5PidgeottoSettled`, `drawTurn13MurkrowSettled`) and
`speciesIdleAnim.ts`'s ONIX front terminal hand-fit were **not** touched —
their windows derive from ON-profile-legacy traces where the animation
genuinely played, and their species are all `{0,0}` regardless, so nothing
about them was ever wrong. Entry 894's deferred "staged non-ONIX settle
window" oracle-pixel check (folded into Slice D's acceptance bar per entry
891/894) is now **moot at this seam**: there is no species-varying
per-tick playback left to check here at all — Battle Scene OFF settles
every species flat, unconditionally, which this RAM receipt plus the
inert-insurance evidence above already cover in full. Disposition: no
further check needed; the deferred item has nothing left to verify at the
generated-route settle hooks.

## #72 — [CLOSED 2026-08-04; retained as settled record] battleStringResolver completeness guard — FATAL-guard user decision + selection-dismiss timing facts for future option-(a) work

**Original symptom** (2026-08-03, opponent MURKROW's TAUNT crash) and the
full reachability triage (`docs/issue72-reachability-triage.md`: 66
REACHABLE / 41 DEAD / 0 MANUAL of 107 UNRESOLVED `printstring` operands
found by `tools/report/printstring-literal-census.ts`) are in git history.
**All 66 REACHABLE ids are now landed**, batches 1-9
(`tests/presentationStringIssue72Batch{1..9}.test.ts`, each red-verified via
`git stash -- src/engine/battleResolutionPresentation.ts
src/engine/factoryBattleScriptFullTurnDecision.ts` plus whichever other
engine file that batch touched) — see each batch commit and the prior
revision of this entry for the per-id mechanism notes. Final batch (9):
`STRINGID_MAGNITUDESTRENGTH` (Magnitude's damage-tier name) — the kernel
already captured the roll (`magnitudeHandler`,
`battleScriptRankedBatch1Opcode.ts:130`, matching real source's
`PREPARE_BYTE_NUMBER_BUFFER(gBattleTextBuff1, 2, magnitude)` in
`Cmd_magnitudedamagecalculation`, `battle_script_commands.c:8670-8710`), so
this was presentation-only wiring following the STOCKPILE/PERISHCOUNTFELL
`battleTextBuff1ByteNumber` idiom. Census: 39→38 UNRESOLVED (final).

**USER DECISION 2026-08-03 — the completeness guard stays FATAL everywhere,
including the playable build. Do not re-raise.** The user declined
softening it to a non-fatal/best-effort path: "nah, just crash." Do not add
a fallback, `try`/`catch`, or env-gated non-fatal mode around
`battleStringResolver`/`battleResolutionPresentation`'s placeholder and
unknown-id throws — this decision outlives the now-closed REACHABLE backlog
above and still applies to any future id.

**Selection-rejection advisory slice landed 2026-08-04 (scout option (b),
adopted verbatim).** `describeIllegalMoveSelection`
(`battleScriptActionAdmission.ts`) is a pure, side-effect-free mirror of
`TrySetCantSelectMoveBattleScript` (`battle_util.c:976-1080`)'s six causes
(Disabled/Torment/Taunt/Imprison/Choice-lock/no-PP), sharing its per-cause
predicates with the existing `checkBattleScriptMoveLimitations` bitmask
rather than duplicating them, and reproducing source's own
last-true-wins-on-overwrite winner selection when more than one cause
applies to a slot (Tier-1-pinned). Wired alongside `legalMoveDecisions` as
`legalMoveSelectionRejections` (`factoryBattleScriptFullTurnDecision.ts`) and
surfaced as `rejectionReasonBySlot`, parallel to `legalMoveBySlot`
(`battleCommandPresentation.ts`). The 4 STRINGID resolvers
(`NOPPLEFT`/`PKMNCANTUSEMOVETORMENT`/`ITEMALLOWSONLYYMOVE`/`PKMNHASNOMOVESLEFT`)
are landed in `battleResolutionPresentation.ts`
(`resolveMoveSelectionRejectionMessageLines`/`resolveNoMovesLeftMessageLines`);
`PKMNCANTUSEMOVESEALED`/Imprison stays unresolved on purpose (DEAD carrier,
RALTS-below-floor gate) so the completeness guard stays fatal for it.
`submitBattleDecision`/`legalDecisions`/`battleDecisionBoundary.ts`'s public
contract is untouched, exactly as the scout's option (b) specified — options
(a) (reject-at-submit with a new event kind) and (c) (a full selection
battle-script mini-VM) remain unbuilt, clearly-scoped follow-ups if source-
exact event/requestId fidelity is ever wanted. Tests:
`tests/battleScriptSelectionRejection.test.ts` (20 cases: all six causes,
two multi-cause last-true-wins pins, the per-slot projection, the
`rejectionReasonBySlot` presentation wiring, and all 4 STRINGID resolutions
including the fatal-guard case), red-verified via `git stash`.

**Oracle-verified (2026-08-04):** a `mechanicLab overrides.parties` trace
(BUTTERFREE TACKLE/GUST vs. MURKROW-family TORMENT, `battle-scene-off`,
turn 1 torments the player's just-used TACKLE, turn 2 reselects it) confirms
the real ROM prints exactly "BUTTERFREE can't use the same / move in a row
due to the TORMENT!" byte-for-byte matching this resolver's output.
**Scout-doc correction found in the same probe:** contrary to
`selection-rejection-subsystem-scout.md` §1.2's claim that the selection
scripts' lack of `waitmessage` means "no button-press dismissal and no extra
hold," the real ROM in fact holds the message on screen indefinitely (tested
100+ frames) until a button is pressed, then reopens the move menu ~10-14
frames later — `Cmd_printselectionstring`'s controller-side completion must
gate on more than raw text-printer inactivity. This doesn't affect anything
landed this step (no live dismiss-timing UI was built, per option (b)'s
scope), but whoever builds option (a) or any live text-box wiring for this
family needs the real button-gated timing, not the scout's auto-advance
assumption. (That first Torment probe's trace/PNGs were never banked to
disk — a gap the follow-up below both repeats-not and fixes for its own two
causes.)

**Oracle-verified, remaining two feasible causes (2026-08-04,
`docs/probes/selection-rejection-oracle-verification/`):**
`STRINGID_ITEMALLOWSONLYYMOVE` (`mechanic-selection-reject-choice-band-off.json`:
CHANSEY holds Choice Band, turn 1 uses TACKLE, turn 2 attempts GROWL) prints
exactly "CHOICE BAND allows the / use of only TACKLE!" byte-for-byte
matching the resolver. `STRINGID_NOPPLEFT`
(`mechanic-selection-reject-no-pp-off.json`: CHANSEY's SUNNY DAY genuinely
depleted 5→0 PP over 5 real turns — `overrides.parties` cannot inject PP
directly, only derive it from base PP × PP Ups — then reselected with
TACKLE still legal so the menu stays open) prints exactly "There's no PP
left for / this move!" byte-for-byte matching the resolver. Both traces and
PNGs are checked in this time (`tools/battle-lab/mechanic-selection-reject-
{choice-band,no-pp}-off.json`, receipts under the probe doc above) — no src
mismatch found, no fix needed. **`STRINGID_PKMNHASNOMOVESLEFT` was not
attempted**: it needs all four move slots at 0 PP simultaneously, and every
slot's PP is independently ROM-derived with no injection path; the cheapest
depletion vehicle would cost 4×5=20 real turns (or a riskier 4-turn Sketch
path gated on an unverified speed-ordering argument — see the probe doc's
closing section for the full reasoning). All three causes' resolver text
was already Tier-1-pinned before this step
(`tests/battleScriptSelectionRejection.test.ts`); this step only added the
oracle-side confirmation for two of the three untested causes.

**Leads:** rerun `node --experimental-strip-types tools/report/
printstring-literal-census.ts` after any `messageLines`/battle-script-program
change (deterministic, re-derives from the tree; stays 38 UNRESOLVED after
this step — structurally blind to the `printselectionstring` family just
landed, per the tool's own known limitation, not re-fixed here). DEAD ids
(facility gates, no-EXP rentals, zero-carrier moves, the sub-110 draft-floor
class, unimplemented mechanics) are not reopened here; full 107-id list incl.
all 37 DEAD gates + emitting script label(s) + trigger/carrier evidence in
`docs/issue72-reachability-triage.md`.

## #73 — Terminal-seam remainder: the win/loss window's oracle-coverage gap (rung B)

**Context:** increments (i)+(ii) landed 2026-08-03/04 (PROGRESS 901/906) for
both outcomes: WIN runs `BattleScript_FrontierTrainerBattleWon`, LOSS/DREW run
`BattleScript_LocalBattleLost`, each as a real second VM pass emitting
resolved message/trainer-slide events. Increment (iii) — the presentation
phase itself — landed 2026-08-04 (PROGRESS 909): `projectBattleResolutionCommands`
(`battleResolutionPresentation.ts`) now has a generic `"trainer-slide"`
command case (keyed off `trainer-slide-in`/`-out` events and the already-
threaded `opponentTrainer`, not DESTIN-hardcoded), the three terminal
STRINGIDs are real dismissible message boxes (`TERMINAL_SEAM_BUTTON_MESSAGE_IDS`,
reusing the same button-advance/dismiss machinery `STRINGID_TARGETFAINTED`
already uses), and `battleResolutionPresentationRender.ts`/`battleScene.ts`'s
generic `renderBattleResolutionSceneOffView` draw the trainer sliding in
(ported `SpriteCB_TrainerSlideIn` settle math, `TRAINER_SLIDE_TIMING`)
before the existing `terminal-handoff` lifecycle phase hands off to
`finishBattle`/`postwin`/`factoryTerminal` exactly as before. Tier-1-pinned
(`tests/presentationTerminalSeamTrainerSlide.test.ts`, DESTIN WIN + JENSON
LOSS, full command/phase sequence including the settle/dismiss timings) and
`compare:differential` stayed 128/128 byte-identical.

**2026-08-04 rung-B session: `TRAINER_SLIDE_TIMING` corrected 53→38,
pixel-verified; `npm run compare` wiring for either outcome NOT completed.**
Direct pixel evidence (dense per-tick re-probe of the committed LOSS fixture,
`tools/battle-lab/loss-terminal-explosion-dusclops-off.json`, frames
2994-3059, via `bin/oracle lab`) finds the trainer sprite's on-screen
bounding box first move at tick 3009 and stop moving at tick 3034 — **38**
ticks after the slide dispatches (opponent-controller command 6→8 at 2996),
not 53 (the old constant) and not the 61-tick span this issue's prior text
guessed at (that 61 was the *empty-field-to-text-start* span, which also
includes an unrelated ~10-tick dispatch/ack gap before the sprite becomes
visible plus the message's own per-character typing time — not the slide
alone). The fit is exact, not approximate: `offscreenX2 = 2*(38-age)`
reproduces the measured leading edge at all 8 sampled ticks from first
visibility (age 13, x=239) through settle (age 38, x=189). The old 53 was
independently wrong twice over — never pixel-fit-verified, and its own
source arithmetic was off (`OpponentHandleTrainerSlide` in
`reference/pokeemerald/src/battle_controller_opponent.c:1385-1390` creates
the sprite at `x2=96` stepping `sSpeedX=-2`/callback, i.e. 96/2=48 callbacks
by that math alone, still not 53). Landed in `src/engine/
battleResolutionPresentation.ts` (`TRAINER_SLIDE_TIMING`,
`BattleTrainerSlideTiming`) with the corrected citation in place; Tier-1 pins
in `tests/presentationTerminalSeamTrainerSlide.test.ts` red-verified against
the old values (53, `offscreenX2: 106`) before updating to the new ones (38,
76). Full `npm test` (702 files/6,792 passed/1 skipped) and `npm run build`
green at this fix; `compare:differential -- battle-command-generated-off.json
--base a7bbed0b --summary` stayed 128/128.

**2026-08-04 LOSS-half: all three diagnosed classes fixed; small residual
classes remain (1/236 frames fully match — the original entry inverted this
as "235/236"; supervisor-corrected).** The compare
wiring landed that morning (`29e5cb3d`, `tools/compare/appTrace.ts`'s
`loss-terminal-window-off` stage) at a reproducible 0/236 baseline with
three diagnosed mismatch classes. This session fixed all three:
- **(A) genuine render gap, fixed in `src`:** `VARIOUS_RETURN_OPPONENT_MON1/2`'s
  real controller receipt is `CONTROLLER_RETURNMONTOBALL`
  (`BtlController_EmitReturnMonToBall`), not `CONTROLLER_SPRITEINVISIBILITY`
  — `battle_controller_opponent.c`'s `OpponentHandleReturnMonToBall`/
  `FreeMonSpriteAfterSwitchOutAnim` both call `SetHealthboxSpriteInvisible`
  alongside destroying the sprite, unlike `OpponentHandleSpriteInvisibility`
  (`Cmd_moveend`'s Dig/Fly semi-invisible toggle, `Cmd_makevisible`), which
  never touches the healthbox. Both real ROM commands were modeled as the
  same kernel event kind (`set-battler-sprite-visibility`); the
  `"sprite-visibility"` presentation command now carries a `recall` flag
  distinguishing them, sourced generically from the emitting instruction's
  own interpreter provenance (`opcodeName === "B_SCR_OP_VARIOUS"`), not any
  window-specific special case. `battleResolutionPresentationRender.ts` gates
  `visibility.{player,opponent}.healthbox` on a new `healthboxVisibility` map
  that only recall transitions touch. Red-verified via
  `tests/presentationTerminalSeamTrainerSlide.test.ts`'s LOSS case (asserts
  `{sprite: false, healthbox: false}`; `git stash -- src/engine/
  battleResolutionPresentation.ts src/engine/battleResolutionPresentationRender.ts`
  flips it to `{sprite: false, healthbox: true}`, the bug). Existing Dig/Fly
  pins (`turn15FlyResolutionAdapter.test.ts`) and every other
  `sprite-visibility` pin (`toMatchObject`/`objectContaining`, plus two
  `toEqual` arrays updated to `recall: false` in `battleTurnPortability.test.ts`)
  are unaffected — landed `c8cc6cd4`.
- **(B)+(C) scaffold artifacts, fixed in `tools/compare/appTrace.ts` only:**
  the antecedent "MURKROW fainted!" box and the player's all-fainted empty
  field are the *same* real event — MURKROW's own Explosion self-KO
  (`setatkhptozero`) — now replayed through the real
  `health-bar-update -> hp-change -> faint-animation -> STRINGID_ATTACKERFAINTED`
  chain (not `STRINGID_TARGETFAINTED`: the move's *user* is the one who
  faints here) ahead of the existing recall/slide/win-text events, all
  hand-set to `commandIndex: 4` (outside real ticks, same idiom as the prior
  single-command skip) rather than replayed from true frame 0.
  `TERMINAL_SEAM_SCAFFOLD_PLAYER`'s species changed to MURKROW (198) so the
  real name resolver — not a hardcoded string — reproduces the oracle's
  literal text. The real `"faint"` command's existing `fainted`-gated
  visibility hides the player sprite+healthbox as a side effect, so no
  separate synthetic event was needed for (C).
- **Result:** `npm run compare -- loss-terminal-window-off --summary`:
  **1/236 frames fully matched** (frame 3231, both times), the other 235
  reduced from the ~7,700-8,300px baseline to the residual classes below,
  byte-identical across two independent runs plus a third supervisor rerun
  post-animation-fold (run-2026-08-04-17-32-22Z-58459).

**2026-08-04 cursor-gating landed (`5e7457b1`): 175/236 frames fully
matched** (twice-run byte-identical + independent supervisor rerun). The
wait-cursor mechanism is source-confirmed and gated
(`TERMINAL_SEAM_QUOTE_MESSAGE_IDS`: the two quote ids' wait is
`BufferStringBattle`'s appended `EXT_CTRL_CODE_PAUSE_UNTIL_PRESS` →
`TextPrinterWait`, no down-arrow ever; `STRINGID_PLAYERDEFEATEDTRAINER1`
ends in a literal `\p` → `TextPrinterWaitWithDownArrow` and **keeps** its
cursor — load-bearing for the WIN-side wiring). Full mechanism + citations:
`docs/terminal-seam-loss-path-ground-truth.md` §6.

**LOSS window CLOSED at 236/236 (`40b75dc6`, supervisor re-verified
independently).** Both residual classes fixed scaffold-only in
`tools/compare/appTrace.ts`'s `lossTerminalWindowStage`, per
`docs/terminal-seam-antecedent-boundary-probe.md`.

**WIN window wired 2026-08-04 (`af036937`): 65/65 byte-identical twice-run
on the covered span** (trainer slide + swap edge + most of the quote's
typing), with WIN's own probe constants banked
(`docs/terminal-seam-win-window-probe.md`: antecedent `readyTick=4262`,
`dismissTick=4608`, `frozenCursorAge=346`; +3 swap-edge shape RAM-confirmed
identical to LOSS). Bounded short of the full 241-frame window by a
GENUINE src bug (DESTIN's 23-char speechLose skips its own dismiss wait).
Two scaffold-side bugs found and fixed during wiring are documented in the
probe doc (held-cursor last-match lookup; frame0 from ack−38, since
`TRAINER_SLIDE_TIMING=38` is calibrated against coarse dispatch, not
RAM-precise dispatch).

**Button-message dismiss-skip race FIXED 2026-08-04 (`e88fb4a5`, was filed
as ISSUES #75).** `isBattleResolutionCommandComplete` now defers to
`isBattleResolutionButtonMessageReady` for any `message`+`advance:"button"`
command, so the length-derived duration formula can never substitute for
the real dismiss wait regardless of printable length vs `minimumFrames`.
Red-verified on DESTIN's exact 23-char `speechLose` lines (doubles as the
`minimumFrames-1` boundary case,
`tests/presentationTerminalSeamTrainerSlide.test.ts`). Regression sweep:
`loss-terminal-window-off` 236/236, `win-terminal-window-off` 65/65,
`compare:differential -- battle-command-generated-off.json` 128/128,
full `npm test` 721/721 files (6,926 passed/1 skipped, no existing pin
depended on the old skip timing).

**WIN window extended 2026-08-04 (`9b0a04dc`, merged `bba958a3`): 65/65 →
389/389** (frames 4623–5011: slide + swap edge + fully-typed quote + the
323-frame settled hold + the real dismiss press's first tick), twice-run
byte-identical + supervisor rerun post-merge; LOSS re-held 236/236. Pure
data change — `winTerminalWindowStage` needed zero code edits; the trace's
segments are a literal prefix of the committed fixture's own recorded
schedule. Pinned: quote settled span 4688–5010, real dismiss tick 5010
(2-tick press at 5011–5012). The scaffold party-identity gap this paragraph
used to flag here (`docs/terminal-seam-win-window-probe.md` §5, frame 5012's
`assertSamePartyIdentity` throw) was fixed generically in a later session
(`hp: 0` on both terminal-seam scaffold configs, §6 of that same doc,
PROGRESS entry 931) — frame 5012/3232 no longer crash on either window.

**Post-`finishBattle` presentation timing (§6's real blocker) closed for
slice 1 of the 5-slice plan in `docs/post-terminal-return-to-lobby-ground-truth.md`:
WIN 389/389 → 503/503, LOSS 236/236 → 350/350, both twice-run
byte-identical.** The shared 108-tick return-to-field span (dismiss+8
fade-to-black → dismiss+37, black hold, `BeginFastPaletteFade(3)`'s
battle-room fade-in-with-brightness-pulse dismiss+58→+96, second black hold
through dismiss+115) is now one outcome-agnostic mechanism, reusing the
existing (previously Turn17-canonical-only) `postwin.ts` phase machine
(`postwinPhase`, `POSTWIN_BATTLE_FADE_FIRST_AGE`/etc., unchanged) for BOTH
outcomes: `createPostwinStateFromRound` (WIN) and the new
`createBattleReturnHoldState` (LOSS/roundCompleted) both start `elapsed` at
the same value (1, one tick later than Turn17's own convention — this
route's real dismiss press is 2 ticks vs. Turn17's 1). Battle Scene OFF's
`renderPostwinState` gained a `frozenSceneView`-driven fallback (a snapshot
of `createBattleResolutionPresentationRenderView` taken the instant
`finishBattle` fires) for the `battleHold`/`battleFade` phases, since
`state.battleScene` (Turn17's own equivalent) is always null on this route;
the fade math reuses `BeginFastPaletteFade`'s real BG/OBJ-alternating-update
schedule (`applyFastFadeToBlack`/`fastFadeUpdatesForLocalTick`, new exports
in `battleScene.ts`, factored out of the existing Turn17 fade function) over
a mask built from `renderBattleResolutionSceneOffView`'s own draw calls plus
the settled trainer-slide sprite (`drawBattleResolutionSceneOffFadeMask`,
new). `render()` now checks `state.postwin` (while its phase isn't yet
`counterRoom`) ahead of `factoryTerminal`, so LOSS's shared span renders
before its own (out-of-scope, still-uncalibrated) Lobby content takes over;
`factoryTerminal`'s own per-tick branch in `tick()` now also advances
`postwin` underneath itself, fixing a found-along-the-way bug where it
otherwise froze the shared clock at its initial tick forever. Tier-1 pin:
`tests/factoryBattleReturnPresentation.test.ts` (4 tests: shared elapsed
start, every doc-cited phase boundary, a full 114-tick lockstep WIN/LOSS
phase-sequence walk, the fade BG/OBJ update schedule) — the elapsed-start
and fade-schedule pins were red-verified this session (flipped
`GENERATED_ROUTE_INITIAL_ELAPSED`/`objUpdates`' formula, watched two tests
fail, reverted). Full `npm test`/`npm run build` green at this session's
final commit (see PROGRESS for exact counts). **Out of scope, next pickup:**
slices 2–4 — LOSS's Lobby arrival + first message + held-cursor dismiss,
LOSS's restore/save wait + record prompt, WIN's PreBattleRoom arrival + heal
message (all past dismiss+115, where the two destinations genuinely
diverge) — see that doc's §5 for the bounded plan.

**2026-08-04 slice-2 groundwork: the Lobby arrival's real schedule mapped
dense and the shared field renderer corrected to the real warp camera —
committed as an exact-foundation checkpoint (LOSS 350/350, WIN 503/503
both still twice-stable), exactness past frame 3345 NOT yet reached.** A
bounded MAIN-lane worker probed frames 3346-3834 of the committed LOSS
fixture 1-tick dense (per-slice `bin/oracle lab` passes, receipts at the
end of this paragraph) and corrected two things in
`src/engine/factoryTerminalRender.ts` that the prior probe-side staged
seam had masked:
- **Camera.** The real post-terminal Lobby warp (4,8) centers the field at
  the layout's own `cameraOriginPx` ({x:-48, y:56}) — the renderer was
  hardcoding a `bgOriginX=16` left over from the staged (8,8) probe camera.
  `renderFactoryTerminalField` now renders the field at `cameraOriginPx.x`
  by default; the extracted 19×12 Lobby tileset is pixel-exact against the
  oracle at that origin (measured 0 diff outside the object sprites at
  frame 3361). Both committed terminal windows stop exactly at dismiss+115
  (WIN 5125, LOSS 3345), so neither ever rendered the lobby field — the
  change is inert there, confirmed by re-running both at 503/503 and
  350/350.
- **Object OAM anchors.** The old per-object formula hardcoded a -16px x
  anchor (staged-camera artifact). All object-event sprites anchor through
  the same camera with `centerToCornerVec` = -(width/2) and the standard
  16×32 `sprite->y += 16 + centerToCornerVecY` feet-anchor
  (`event_object_movement.c:1850-1854`, `sprite.c:349-355`); the player's
  own sprite additionally carries the standard +1px x2 sub-pixel. Object
  screen positions are now `tile.x*16 - cameraOriginPx.x` (+1 for player)
  and `tile.y*16 - cameraOriginPx.y - 21`. Verified: player at (113,51),
  fatMan (6,10) and woman (3,11) at their oracle blobs (their upper halves
  correctly hidden behind the counter's NORMAL top layer); singles
  attendant (4,7) hidden behind the counter; doubles attendant/camper/
  picnicker off-screen right. Frame 3361 residual dropped 26014 → 1095 px
  (all in the three sprite silhouettes, still pose/anchor pixels to fit).
  *[2026-08-04 correction: the "+1px x2 sub-pixel" / (113,51) player anchor
  was the erroneous offset this step removed — see the closing paragraph of
  this entry; the player now anchors at (112,56) with 0 diff.]*
- **Real schedule (banked for the timing calibration, dense 1-tick):**
  Lobby fade-in age 114-128 (terminal age = frame − 3232), map settle (no
  box) 129-140, box open 141-142, page 0 "Thank you for participating!"
  typing 143-170 + cursor 171-302, fixture's real A at 300 dismisses it,
  box clear 303-305, page 1 "I will return your POKéMON in exchange /
  for our rental POKéMON." typing 306-365 + cursor ~366-601, fixture's real
  A at 602 dismisses it (frame 3834 = slice 2's end). The prior scout
  doc's "repeating 3-frame walk-cycle" (3350-3510) is actually the page-0
  held-cursor blink only — `lockall` freezes every NPC, so no walk
  animation is needed.
- **Timing recalibrated + object anchors corrected (this session's second
  commit): `FACTORY_LOSS_TERMINAL_PROFILE` now models the real
  post-terminal schedule** (fieldFirstAge 114 / messageFrameAge 141 /
  page-0 text 143 / page-0 input-ready 171 / nextPageVisualDelay 2, i.e.
  page-1 text at page0release+2; all ages = frame − 3232), and the object
  OAM anchors use the source 16x32 feet-anchor (`box top = tile*16 −
  cameraOrigin − 16`, `event_object_movement.c:1850-1854`), which makes the
  fatMan/woman/scientist sprites pixel-exact (0 diff vs the oracle at frame
  3361). The four LOSS state-machine pins in
  `tests/factoryTerminalPresentation.test.ts` and the one in
  `tests/interactiveRouting.test.ts` were re-based to the real route's
  release edges (+171/+238 pages, +524 B-release, +288 completion, +547/+549
  record menu). Measured on a dense 3346-3834 scratch window: fade-in 37-133
  px, page-0 typing 133-175, page-0 cursor 133-170, page-1 typing 182-898,
  page-1 cursor 133-229 — down from 26014 px before the camera fix.
- **Page-transition residual class RESOLVED (2026-08-04, R5 MAIN worker):
  `nextPageVisualDelay` is 2, not 6 — and the whole page-1 window is now
  exact.** The earlier "page-1 typing 182-898 px" measurement and the
  "RenderText printer pause cadence" attribution were both artefacts of the
  wrong `nextPageVisualDelay`: a dense 1-tick re-probe of the committed
  LOSS fixture (frames 3534-3600) shows the real printer types page-1
  **1 glyph/tick with no pauses** — the "no-change" frames are exactly the
  two invisible space glyphs, and the "3-tick box clear/reopen" at
  3535-3537 is page-1's opening "I " of "I will return your POKéMON in
  exchange" printing onto the box frame itself (the serif-I's pixels are
  the frame's own border pixels, so the box reads empty at 3535-3536 and
  the first visible glyph "w" lands at 3537). With `nextPageVisualDelay=2`
  the generic `factoryTerminalActivePage`/`factoryTerminalPageTextFirstAge`
  flip happens at the real edge (release+2), and the existing 1-char/tick
  `factoryTerminalVisibleChars` model reproduces every frame 3535-4053
  (page-1 typing + cursor + dismiss + page-2 typing + cursor) **0 diff
  outside the out-of-scope player sprite** (twice-run byte-identical on the
  scratch windows below). The mechanism is expressed as a first-class
  source-relative phase — `FactoryTerminalPageVisualPhase`
  (`idle`/`typing`/`held`/`cleared`, `factoryTerminalPageVisualPhase` in
  `factoryTerminalPresentation.ts`), documented against the real
  CHAR_PROMPT_CLEAR handoff (text.c RENDER_STATE_CLEAR: the released page
  stays drawn `nextPageVisualDelay` ticks, then FillWindowPixelBuffer wipes
  and the next page prints the same tick), with the render's page cursor
  gated on it. Two red-verified Tier-1 tests
  (`tests/factoryTerminalPresentation.test.ts` "holds the released page…"
  + "renders the box-clear/reopen phase…"; both fail with the old value 6
  stashed). The record-prompt transition at frame 4054+ (the next box
  clear, ~1,350 px) is slice 3's own territory, untouched here.
- **Residual-class paragraph that used to live here (the "player sprite is
  the save's real red-brown-hat character, not Brendan" theory) was WRONG
  and is deleted, not just retracted** — kept getting re-discovered as a
  live TODO by readers who stopped at this paragraph without reaching the
  next one. The very next paragraph (same date) found the real cause (a
  wrong `+1px x2` OAM sub-pixel offset) and closed it using the *existing*
  Brendan asset unmodified. **2026-08-10 MAIN worker re-confirmed live:**
  no player-graphic extraction exists or is needed; `factoryTerminalRender.ts`
  resolves the player object through the same generic
  `factory-lobby-terminal-npcs.json` + `cameraOriginPx` anchor path as every
  other Lobby object. Fresh `npm run compare` (oracle-backed, run twice each)
  confirms the committed windows are exact and far larger than any
  "350/350" / "503/503" checkpoint: `loss-terminal-window-off` **1943/1943**,
  `win-terminal-window-off` **3590/3590**, `battle-command-generated-off`
  **128/128** — i.e. slices 2-5 below are already closed end-to-end,
  including the record prompt, decline continuation, and most of the WIN
  GO-ON path through the swap screen.
- **2026-08-04 LOSS slice-2 player-sprite residual CLOSED + window extended:
  `loss-terminal-window-off` is 839/839 exact through frame 3834, twice-run
  byte-identical.** Two source-side corrections, both pure logic in the
  terminal presentation (no generated asset/extractor edit; the supervisor's
  evidence that `factory-lobby-terminal-npcs.json` already carries the exact
  north-facing Brendan frame 1 + palette was confirmed — no new player
  graphic was ever needed, and the earlier "different player asset" claim
  below is **retracted** as the stale mis-attribution this paragraph records):
  1. **Player OAM anchor** (`factoryTerminalRender.ts`): the generic Lobby
     object anchor's player-only `+1px x2` sub-pixel offset was wrong — it
     placed the sprite at (113,56), reproducing the ~133px residual exactly.
     Removed; all object events now anchor at `tile*16 - cameraOriginPx`
     (player tile (4,8), cameraOriginPx {x:-48,y:56} → (112,56)). The
     source-derived field + player at (112,56) match the oracle's frame 3365
     with 0 differing pixels. Tier-1 pin (red-verified by stashing): player-
     unique pixels at the source-derived screen positions (hat blue-grey
     (117,66), hat white (116,69), shirt red (113,80), navy (115,73)/(125,82),
     right-edge (126,81)).
  2. **Page-0 first-glyph age** (`FACTORY_LOSS_TERMINAL_PROFILE.
     firstPageTextAge`): corrected **143 → 142**. The prior worker's dense
     scratch windows only covered page-1's span (3534+); a fresh oracle
     re-probe of the committed fixture's frames 3373-3375 shows the box
     opens at terminal age 141 and page-0's first glyph "T" lands at age 142
     (frame 3374), so 143 delayed every page-0 typing + cursor frame by one
     tick (frames 3374-3403 typing, 3412-3529 cursor phase). Tier-1 pin
     (red-verified by stashing): `firstPageTextAge === 142` with
     `factoryTerminalVisibleChars` 0/1/2 at ages 141/142/143.
  The committed trace's segments were restored to the fixture's own real
  schedule through cumulative 3834 (segments 0..41, unchanged buttons; the
  committed window's tail had truncated the fixture at segment 39/3345) and
  `captureFrames` extended contiguously 2996..3834 (839 frames). WIN remains
  **503/503**. Slice 2 is therefore exact end-to-end; the only remaining LOSS
  slice-2 boundary is slice 3's own record-prompt transition (frame 4054+,
  ~1,350 px).
- **2026-08-05 LOSS slice 3 CLOSED end-to-end: `loss-terminal-window-off` is
  1943/1943 exact through the fixture's honest endpoint frame 4938, twice-run
  byte-identical (PNG-hash equal).** One generic source-relative correction
  closes the entire 3835-4938 span (the record question + multichoice):
  `FACTORY_LOSS_TERMINAL_PROFILE.recordPromptDelayFromRestore` is **169, not
  172** — the same value the roundWon profile already carried, so both
  outcomes now share one restore-to-question gap. Dense 1-tick scratch
  compare over the whole extension plus per-frame pixel decoding pinned the
  real schedule: the record box clears at frame 4054 (terminal age 822), the
  "W" of "Would you like to record your last" lands at 4055 (age 823), line-2
  continues "BATTLE FACTORY match on your FRONTIER PASS?" on the same row,
  the first red wait-cursor appears at 4118 (age 886, exactly
  `promptFirst + recordPromptInputDelay + 1`), the fixture's own A at
  4136-4138 dismisses it, and the box scrolls to the held
  "BATTLE FACTORY match on your / FRONTIER PASS?" + YES/▶NO multichoice
  (160,8) hold that is byte-identical to the fixture's own final captured
  frame 4938. The app's release ages are the tick after the fixture's dismiss
  A (page-1 A at age 602 → `secondPageReleaseAge` 603, restore 653), so
  653 + 169 = 822 lands exactly on the real box-clear; the old 172 cleared
  two ticks late and typed two chars behind every frame 4054-4126 (the
  measured ~1,350px box-clear residual). No new input, no absolute-frame/
  battle-number/fixture branch, no generated asset/extractor change, no WIN
  route touch (the fix is LOSS-profile-only and inert in the WIN window).
  The committed trace's segments are now the fixture's full 46-segment prefix
  byte-for-byte (the last A at 4136-4138 and the 800-tick idle tail are the
  fixture's own recorded schedule) and `captureFrames` extend contiguously
  2996..4938 (1943 frames). Two red-verified Tier-1 pins
  (`tests/factoryTerminalPresentation.test.ts`: delay 169 + derived
  promptFirst 822/textFirst 823/inputReady 885, and the render's empty
  box-clear frame at 822 vs. the first "W" at 823; both fail with 172
  stashed). WIN re-held **503/503**; full `npm test` 727 files / 6,970
  passed / 1 skipped and `npm run build` green. Slice 3 is exact end-to-end;
  the only remaining LOSS-terminal work is out of this fixture's own recorded
  reach (the record-accept/decline branch through to free-roam, which needs a
  new fixture per `docs/post-terminal-return-to-lobby-ground-truth.md` §5
  slice 5).
- **2026-08-05 WIN slice 4 CLOSED end-to-end: `win-terminal-window-off` is
  890/890 exact through the fixture's honest endpoint frame 5512, twice-run
  byte-identical (PNG-hash equal), LOSS re-held 1943/1943.** The generic
  postwin PreBattleRoom return/heal span (dismiss+116..+502, frames
  5126-5512) is promoted from the side-lane evidence packet
  (`docs/win-prebattleroom-return-evidence.md`, whose spec windows
  win-prebattleroom-return-off-a/b reproduced at 256/256 + 131/131) into the
  canonical committed compare trace: last segment 113→500 so the 22-segment
  schedule is byte-for-byte the fixture's own full 5512-frame
  `trace.segments` (no invented input, no presses past the fixture's own
  last A at 5010-5011), and `captureFrames` dense 4623..5512 (890 captures).
  **No src edit** — `createPostwinStateFromRound`/`renderPostwinState`'s
  `counterRoom` phase (postwin age = frame − 5011) already reproduces every
  measured boundary with no clock adjustment: PreBattleRoom fade-in
  5126-5140, settled player+attendant hold 5141-5149, message box fully
  formed in one tick at 5150, 1-glyph/tick typing 5151-5202 (52 glyph
  positions incl. the 7 space pairs), byte-identical held "Thank you for
  competing! / Let us restore your POKéMON!" 5202-5512. The canonical
  503/503 baseline was re-run before the extension. Both outcomes' remaining
  terminal work is now out of this fixture's own recorded reach (the
  record-accept/decline branch through to free-roam, which needs a new
  fixture per `docs/post-terminal-return-to-lobby-ground-truth.md` §5 slice
  5, same as LOSS slice 5).
- **2026-08-05 LOSS decline continuation CLOSED end-to-end: `recordChoice`
  is no longer a dead-end — the generic NO branch drives the source
  `EndRecordBattle` farewell through the free-roam Lobby field, and a new
  canonical trace `loss-terminal-decline-continuation-off` is exact
  **155/155** twice fresh (PNG-byte-identical), LOSS/WIN/win-beyond
  re-held 1943/1943 + 890/890 + 228/228.** The shared
  `advanceFactoryTerminalRecordPrompt` now stores the decline edge (the
  tick the record menu's NO is stored; age 1757 = frame 4989 under the
  app's release-age convention) plus the farewell's own second-A dismiss,
  and `factoryTerminalRender` draws the span edge-relative per
  `BattleFrontier_BattleFactoryLobby/scripts.inc:81-94`: YES/NO window
  clears edge+1 (frame 4990), box wipes edge+3 (4992), the 35-glyph
  "We look forward to your next visit." types 1 glyph/tick from edge+4
  (4993), holds from edge+39 with **no wait-cursor** (measured zero red
  down-arrow pixels across the whole hold), the second real A registers at
  edge+102 (5091), and the box closes into the bare Lobby field at
  dismiss+2 (5093) — the field-only frame `toEqual(renderFactoryTerminalField())`,
  and every later static frame is byte-exact with no work. Focused 1-tick
  scratch compares pinned the boundaries first (4988-5030 **43/43**,
  5088-5094 **7/7**); the canonical trace's segments are byte-for-byte the
  committed scratch-loss-beyond-boundary-probe schedule with `captureFrames`
  dense 4939..5093 (155). The evidence trace `loss-beyond-boundary-off` is
  unchanged (162/183 — every residual is the fixture's own post-5174 walk
  samples, out of scope). NO only; the YES and B/cancel branches stay
  unconsumed (record playback + free-roam movement remain the open LOSS
  boundaries). Two red-verified Tier-1 pins
  (decline state machine + decline render; both fail with the old source
  stashed); full `npm test` 727 files / 6,972 passed / 1 skipped and
  `npm run build` green.
- **2026-08-05 WIN GO ON → first scouting message promoted into the
  canonical window: `win-terminal-window-off` is **2082/2082** exact through
  the genuine held first scouting boundary at frame 6704, twice fresh
  (PNG-byte-identical), regressions re-held LOSS 1943/1943, LOSS decline
  155/155, win-beyond 228/228, win-go-on-scout 143/143.** The supervisor-
  rerun GO ON evidence (`tools/compare/traces-groundtruth/win-go-on-scout-off.json`,
  143/143, `docs/post-terminal-beyond-boundary-win-go-on-scout-evidence.md`)
  is promoted into the canonical acceptance window as a **pure data change
  (zero src edits)**: the trace's scenario switches to
  `scratch-win-go-on-scout-probe.json`, its 27 segments are byte-for-byte
  the fixture's own full input prefix (verified before writing; no invented
  presses, nothing past the fixture's single GO ON A at 6634-6635), and
  `captureFrames` extend contiguously 4623..6704 (2082 captures). The
  existing `postwin` continuation machinery
  (`acceptPostwinContinuation` → `dialoguePage 1` →
  `POSTWIN_SCOUTING_LINES[0]`) reproduced every boundary with no
  calibration: GO ON menu hold through 6633, multichoice dismiss/box-clear
  6636-6638, the 65-frame first-scouting-message typing 6639-6703, and the
  wait-cursor hold from 6704. **Canonical covered boundary:** the WIN
  terminal window now runs from the DESTIN slide (4623) through the held
  first scouting page unpressed. **Remaining WIN work (unchanged):** the
  pages past the held first scouting message — the type/style commentary
  (`CommentOnOpponentType`'s `TrainerSkilledIn…` lines) and the swap offer —
  each need their own new fixture A press; the GO ON/RECORD/REST/RETIRE
  selection is now partially canonical (GO ON consumed), with RECORD/REST/
  RETIRE still unpressable on a committed fixture. LOSS's remaining boundary
  stays the record playback + free-roam movement.
- **2026-08-05 WIN opponent-type commentary bound at the next held page:
  `win-go-on-type-commentary-off` is **93/93** exact twice fresh through
  frame 7308, with no production change.** A file-disjoint fixture preserves
  the prior 27 segments byte-for-byte, presses the held first scouting page
  once at 7237-7238, observes box clear 7240 and the 67-frame no-favorite-
  type line at 7241-7307, then stops on the wait-cursor hold from 7308.
  Existing `acceptPostwinDialoguePage` / `dialoguePage 2` rendering is the
  whole mechanism. Remaining WIN work narrows to the battle-style page, swap
  offer/decision, and the unexercised RECORD/REST/RETIRE continuation choices.
- **2026-08-05 WIN opponent-type commentary promoted into the canonical
  window: `win-terminal-window-off` is **2686/2686** exact twice fresh
  through the held boundary at frame 7308, pure data change (zero src
  edits).** The trace's scenario switches to
  `scratch-win-go-on-type-commentary-probe.json` with segments byte-for-byte
  the newer fixture's own full 29-segment/8138-frame schedule (prefix-proven
  before switching: old canonical 27 == prior fixture's full 27 == newer
  fixture's first 27) and `captureFrames` contiguous 4623..7308 (2686).
  Existing `acceptPostwinDialoguePage` / `dialoguePage 2` /
  `POSTWIN_SCOUTING_LINES[1]` reproduced every frame with no calibration.
  Regressions re-held: LOSS 1943/1943, LOSS decline 155/155, WIN beyond
  228/228, GO ON scout 143/143, type-page 93/93. Remaining WIN work narrows
  to the battle-style page, swap offer/decision, and the unexercised
  RECORD/REST/RETIRE continuation choices.
- **2026-08-05 WIN battle-style commentary promoted into the canonical
  window: `win-terminal-window-off` is **3590/3590** exact twice fresh
  through the held boundary at frame 8212, pure data change (zero src
  edits).** The trace's scenario switches to
  `scratch-win-go-on-style-commentary-probe.json` with segments byte-for-byte
  the newer fixture's own full 31-segment/9040-frame schedule (prefix-proven
  before switching: old canonical 29 == prior fixture's full 29 == newer
  fixture's first 29; no invented input, nothing past the fixture's single
  style-page A at 8138-8139, no press into the swap offer) and
  `captureFrames` contiguous 4623..8212 (3590). Existing
  `acceptPostwinDialoguePage` / `dialoguePage 3` /
  `POSTWIN_SCOUTING_LINES[2]` reproduced every frame with no calibration.
  Regressions re-held: LOSS 1943/1943, LOSS decline 155/155, WIN beyond
  228/228, GO ON scout 143/143, type-page 93/93, style-page 92/92. Remaining
  WIN work narrows to the swap offer/decision and the unexercised
  RECORD/REST/RETIRE continuation choices.
- **2026-08-05 WIN swap offer bound at the real YES/NO hold:
  `win-go-on-swap-offer-off` is **115/115** exact twice fresh through the
  input-ready boundary at frame 9111, with no production change.** The
  recovered evidence fixture preserves the prior 31 segments byte-for-byte,
  presses the held style page once at 9040-9041, observes box clear 9044,
  60-character offer typing 9045-9104, YES/NO window copy at 9107, and input
   readiness at 9111. Temporary side-lane debug instrumentation was discarded;
   the folded commit contains only the fixture/spec/note. Remaining WIN work
   is a real NO or YES decision plus the unexercised RECORD/REST/RETIRE paths.
- **2026-08-05 WIN swap-offer NO decision bound end-to-end through the
  guide: `win-go-on-swap-offer-no-off` is **213/213** exact twice fresh
  (frames 9930-10406), canonical WIN/LOSS/decline/commentary all re-held
  (3590/3590 + 1943/1943 + 155/155 + 228/228 + 143/143 + 93/93 + 92/92 +
  115/115 + 128/128).** The new scratch fixture preserves the swap-offer
  fixture's 33 segments byte-for-byte, appends a safely-held DOWN
  (9943-9944, cursor display → NO at 9944), a bounded idle, an A accepting
  NO at 10005-10006, and a bounded idle tail. Dense oracle captures bind the
  NO decision, YES/NO-window dismissal (edge+1), box clear (edge+3), and the
  generic `EnterBattleRoom` "Right this way, please!" guide typing 1
  glyph/tick from edge+4 through its final glyph at edge+26 (frame 10031),
  held **with no wait-cursor** through the endpoint 10406 (the genuine
  held/dismiss-ready boundary — no press into walk/warp, per the bounded
  contract). One generic source-relative fix was required and landed:
  `overlayTerminalKernelParty` (`factoryRoundBattleOrchestrator.ts`) now
  overlays only the four battle-mutable fields (HP/status1/item/PP) onto the
  rental identity instead of spreading the whole terminal party — the WIN
  scaffold's placeholder terminal party (DUSCLOPS, personality `0xff`, IV 3)
  was corrupting the kernel party so `healFactoryKernelParty`'s identity
  guard threw on the NO advance. Red-verified Tier-1 pin
  (`tests/factoryRoundBattleOrchestrator.test.ts`); the existing
  `movePostwinSwapCursor`/`acceptPostwinSwapDecline`/`postwinRightThisWay*`
  machinery reproduced every boundary with zero calibration. Evidence:
  `docs/post-terminal-beyond-boundary-win-go-on-swap-offer-no-decision-evidence.md`.
  Remaining WIN work is the YES branch into the swap UI plus the unexercised
  RECORD/REST/RETIRE continuation choices.
- **2026-08-05 WIN guide dismissal, walk, warp, and Battle Room handoff are
  exact through the first next-opponent content pixel:**
  `win-go-on-swap-offer-no-guide-dismiss-off` is **232/232** exact across
  frames 10406-10637. The 39-segment fixture preserves the prior 37 segments
  byte-for-byte, dismisses the held guide once, and binds the full generic
  `messageClosing -> walking -> warpFade -> battleRoom` seam. The first
  divergence at 10638 is content, not timing: the ROM's next trainer is
  LILIANA (id 9, RAM-probed) while the synthetic terminal stage generates
  ABBIE (id 73) from its modeled terminal RNG seed. The generic round owner
  is already at battleIndex 1; aligning the synthetic stage's opponent/RNG
  provenance, without fixture branching, is the remaining far-side task.
  Evidence: `docs/post-terminal-beyond-boundary-win-go-on-guide-dismiss-evidence.md`.
- **2026-08-05 source-order ownership fixed generically (`7708808c`):**
  accepting GO ON now calls `preGenerateFactoryRoundNextOpponent` while the
  defeated opponent remains current, before type/style commentary and the
  swap offer, matching `AskSwapMon`'s `factory_generateopponentmons` order.
  The pending generation owns its RNG receipt immediately and is published
  after either swap result without rerolling; accept still draws its offered
  party from the defeated opponent. Tier-1 pins cover timing, idempotence,
  accept/decline publication, and live routing. This removes the controller-
  sequencing ambiguity but does not synthesize the ROM's ambient VBlank draws,
  so LILIANA-vs-ABBIE at frame 10638 remains #55 rather than a #73 timing fix.
- **2026-08-05 WIN swap-YES bound into the swap screen (`5489a9f7`):**
  `win-go-on-swap-offer-yes-off` is **248/248** exact twice fresh (frames
  9930-10177; supervisor re-ran twice post-salvage): YES accept at
  10005-10006, YES/NO dismissal, box teardown, swap-screen fade/init, and
  the settled input-ready player picker at elapsed 99 (frame 10105). Two
  generic red-verified src fixes: `FACTORY_SWAP_SPECIES_FADE_ACTIVATE_ELAPSED`
  59→63 (`softwareFadeFinishing` holds `gPaletteFade.active` 5 ticks past
  the visual settle) and swap-picker category text derived from
  `draft-pool-header.json` (all 376 species; was a six-species hand-cast).
  Honest boundary: the ball-rocking restart after the first anim-end is
  per-ball `Random()%5` ambient RNG (#55-adjacent), so the window stops one
  frame short of it. **User decisions 2026-08-05 narrow the remainder:**
  RECORD is stub-only (dialogue-exact, in-session flag for the 4→3-choice
  menu variant, no real recording/playback ever), REST is deliberately
  unselectable (real game saves + soft-resets to title —
  `EventScript_PauseChallenge`; no save system in scope; comparison
  fixtures must never press it), RETIRE is implemented fully (its YES jumps
  to `WarpToLobbyLost`, the same script as the loss ending, already exact).
  The walkable lobby (free movement, inert exit door, no PC — the real map
  has none — silent NPCs including the doubles attendant, wandering
  optional) is a user-directed feature sequenced behind the play-test fixes
  #76-#81.

**2026-08-10 generic ball-callback checkpoint:** the unconditional shared
`factorySwapBallTile` restart is removed. `FactorySwapPresentationState` now
owns three `ballAnim.ts` reducer states; fresh `Swap_InitAllSprites` balls
enter moving anim 1 without a roll, `animEnded` rolls are threaded through
core after its ambient VBlank draw in sprite order, successful rolls preserve
the source's one-callback `StartSpriteAnim(0)` delay, and normal-summary return
reconstructs a fresh three-sprite epoch. Tier-1 pins independent states,
ordered consumption, first success/failure/rest boundaries, immutable
round/parties/controller outcome, and summary reconstruction. The committed
YES endpoint stays **248/248 exact twice fresh** at 10177. A fresh mGBA RAM
probe through the fixture's already-present 10214 tail found the remaining
boundary precisely: at first `animEnded`, oracle ambient+callback cursors are
`0xA77397C1 -> 0x33DA400A`, producing failure/success/failure and
`data[0]=[0,32,0]`; the app's unresolved #55 stream reaches `0x8FF192D9`
after ambient and produces failure/success/success. The honest dense extension
is **277/285**, with all eight residual frames confined to ball 2's resulting
tile transitions. Per the fallback contract, the canonical capture endpoint
is unchanged; exact extension remains #55's prohibited/unwired construction-
clock problem, not a presentation branch.

## #55 — Rental-construction RNG stream contract cannot represent ambient VBlank interleaving

**User decision (2026-08-13): PARKED — distribution parity is the product
bar.** At the promised check-in, after a two-agent audit of all 77
`issue55-*` docs, the grind ledger (44 CGB4 versions / 47.6 h / ~26 proven
cycles per round, with SoundMainRAM, CgbSound, and CreateMon effectively
unpriced and no completion estimate recorded anywhere), the user ruled:
hardware-stream personality-exactness is a verification capability no
player can observe — normal play samples the distribution on real hardware
too. The cycle-pricing program is parked at its clean CGB4 v44 checkpoint
(6,258-cycle prefix; every receipt stands unretracted, nothing
half-wired). Consequences: (1) the "personality-exact construction stays
unwired until the model closes" prerequisite is LIFTED — live generation
may wire the engine's clean back-to-back stream, documented as
distribution-accurate (same pools, same rejection rules, same odds), NOT
hardware-stream-exact; (2) byte-exact verification continues only against
captured/adopted seeds (the `anchor-state.json` class); (3) the
no-fitted-constants rule still protects the parked clock's evidence —
`serviceCostMasterCycles` stays null and no fitted clock may pose as the
real one; (4) Noland (`FillFactoryBrainParty`) is unblocked as ordinary
engine work and becomes the main lane's next program; (5) Rust M7c now
waits on the TS live-generation implementation, not on #55 closure. This
supersedes the 2026-08-10 authorization below, which is retained as
history.

**User decision (2026-08-10): GRIND IT OUT.** The user explicitly
authorized pursuing the full construction-clock model ("I would like to
grind that out. I would like to attempt to."), with a progress/opinion
check-in expected after a few more sessions. The standing discipline is
unchanged: only independently source-proven timing components land; no
fitted constants; personality-exact construction stays unwired until the
model closes honestly.

**Wiring landed (2026-08-05, `67211ca2`):** the win-terminal scaffold
(`tools/compare/appTrace.ts` `winTerminalWindowStage`) now carries the ROM's
probed battle-2 schedule per receipt §7 — `playerTrainerId 0x18CC699A`, real
six saved rental set ids, the synthetic terminal battle rngSeed transplanted
to the probed pre-call cursor `0x7399E3AE`, and a new
`FactoryRoundBattleOrchestratorConfig.adoptedNextOpponent` that
`preGenerateFactoryRoundNextOpponent` reads at the GO ON seam, adopting the
per-mon construction cursors so LILIANA (trainer 9) and her exact
personalities (`0x801D2ED7/0x0FFC69A4/0x1AE16FDA`) reproduce byte-for-byte.
Tier-1-pinned; all five committed win/loss terminal traces remain
byte-identical (3590/3590, 248/248, 213/213, 232/232, 1943/1943).
**Remainder (still-open stream-model boundary):** live generation with a
single `constructionRngValue` still cannot express interleaved ambient ticks;
the scaffold sidesteps it via adoption, it does not fix the contract. The
former LILIANA presentation remainder is closed: the generic next-trainer room
route is exact across the broad **903/903** window and a dedicated **115/115**
walk-in/quote receipt (PROGRESS 1015).

**Symptom:** `generateInitialFactoryRentals`'s `constructionRngValue`
contract consumes construction draws back-to-back from one cursor, but on
real hardware `CreateFrontierFactorySelectableMons` spans **53 video frames**
for the anchor draft, and `VBlankIntr`'s ambient `Random()` tick
(`main.c:366`) interleaves into the same `gRngValue` stream mid-loop. Direct
two-cursor replay of the probed anchor cursors reproduces slots 0/2 but
diverges on personalities for slots 1/3/4/5 (first: MAGBY expected
`1534575931`, got `431990256`).

**Confirmed** (2026-07-30, `docs/anchor-draft-cursor-receipt.md` §§3-6):
probe ledger attributes 242 construction draws + 53 ambient ticks in the
6696–6748 window with a gapless LCG chain; **filtering to construction-only
calls reproduces all six anchor personalities byte-for-byte**, so the ported
nature-rejection algorithm is correct — only the stream model is wrong.
Blast radius: setId, species, nature, EVs, moves, item, fixed IVs are
setId/challenge-derived and unaffected; ability slot unaffected for this
anchor (the four wrong slots are single-ability species); personality-derived
gender and shininess are the real exposure. The production anchor route loads
`anchor-state.json` directly and never calls this function today, so nothing
user-visible is wrong now; the boundary bites any future live-generation or
personality-exact receipt (e.g. Gate-6 seeded end-to-end rounds).

**Three-case construction-clock receipt (2026-08-08, `1ee8518f`,
supervisor rerun 11/11):** `docs/issue55-construction-rng-schedule-receipt.md`
records gapless instruction-attributed chains for the six-rental anchor and
two materially different three-mon `FillFactoryFrontierTrainerParty` calls.
Inside the exact function-entry/return epochs the counts are anchor
**242 construction + 52 ambient / 53 frames**, LILIANA **112 + 31 / 32**,
and legal varied trainer 222 **202 + 30 / 31**; the two three-mon rejection
vectors are `[13,7,36]` and `[59,12,30]`, with different inter-burst gaps.
The first anchor-window ambient draw cited above occurs immediately before the
selected function-entry cursor, explaining 53 versus the epoch's 52.
Fixed-frame, fixed-mon-boundary, and draw-count-only insertion schedules are
therefore refuted. The smallest source-general exact contract is an explicit
deterministic construction clock: initial VBlank phase, source-operation cycle
budget (including species/stat work), and an ambient callback at each crossed
period. Until that clock exists, personality-exact live construction remains
honestly out of model; do not promote this test-only receipt or per-fixture
cursors into production.

**New exposure (2026-08-05, #73):** after the WIN swap-decline route, room
movement/warp timing remains pixel-exact, but the synthetic terminal stage
generates battle 2's ABBIE (id 73) while the ROM has already generated LILIANA
(id 9) from the ambiently advanced `gRngValue`. This is the same unresolved
stream/provenance class at a round boundary; it is not evidence for a
trainer-specific presentation branch.

**Ownership correction (2026-08-05, `7708808c`):** the generic round now
pre-generates battleIndex+1 at the accepted GO ON/scouting boundary and
publishes it after swap resolution, matching source `AskSwapMon`. This makes
the modeled RNG spend occur at the right logical seam, but the synthetic
terminal stage's input cursor still omits prior ambient VBlank interleaving;
therefore it still selects ABBIE rather than the ROM's LILIANA.

**Receipt (2026-08-05, `docs/win-battle2-opponent-provenance-receipt.md`,
supervisor re-ran the driver: ALL CHECKS PASSED):** selection is
**single-frame** (frame 6636): pre-call cursor `0x7399E3AE` → 4 gapless
draws (trainer 25209%100 = 9 LILIANA; sets 169/170/130), zero ambient
interleaving inside the span; the app generator reproduces trainer, sets,
species, items, and the end cursor `0x50F04E72` byte-for-byte. Party
*construction* spans 32 frames with interleaved ambient ticks (anchor-draft
class); the per-mon cursors `[0x2F959DF4, 0xBD6F8138, 0xDE320F3A]`
reproduce all three personalities exactly via `adoptFactoryOpponentSchedule`.
Receipt §7 names the scaffold wiring fields (`winTerminalWindowStage`
`rngValue`/`playerTrainerId`/`savedRentalRecords` + the per-mon schedule);
the wiring step is queued.

**Executable clock checkpoint (2026-08-10, `adac4aca`):**
`src/engine/factoryConstructionClock.ts` now provides a source-operation
scheduler with one raw RNG cursor, nature-rejection loops, injectable
operation-cycle costs, VBlank ambient callbacks (including callback cycle
cost), frame/event ledgers, and a separately named clean-stream mode. Its
cost key initially exposed source function, species/nature/EV inputs,
operation kind, attempt, and Random32 half; it cannot see trainer id, battle
index, canonical tick, or a receipt schedule. Focused tests are **15/15** and
preserve the three exact v1 receipt totals (**294/143/232 events**). An opt-in
`FACTORY_CONSTRUCTION_CYCLE_EVIDENCE=1` probe path now records mGBA master
cycles without changing v1 output. Live wiring remains open: a v2 receipt
must bank initial phase, source-operation boundary costs, and ambient callback
cost/order before the generic controller can supply a truthful cost model.

**V2 cycle result (2026-08-10, `3916972f`):** all three direct probe outputs
now bank the missing source and IRQ boundaries and reproduce twice byte-for-
byte (`anchor 631bd214…`, `LILIANA ae1282b7…`, `varied 3e10197a…`; focused
**19/19**). The result identified two independent missing inputs: compiled
nature-check cost varies with the candidate personality (anchor **755–909**
source cycles), while VBlank entry-to-resume cost varies with live audio/DMA
work (anchor **29,475–57,638**, LILIANA **31,368–54,553** master cycles). The
candidate half is resolved immediately below; the hardware-workload half is
still absent. A trainer/set/tick/receipt table remains prohibited; the
isolated scheduler stays unwired.

**Candidate-aware nature timing (2026-08-10, `79448547`):** the cost key now
also exposes each returned Random u16 and the assembled candidate personality,
nature, and accepted/rejected result. `reduceFactoryNatureAttemptTiming`
replays the compiled `GetNatureFromPersonality -> __umodsi3(personality, 25)`
Thumb path and its wrong/accepted caller tails from source/ARM timing, with no
trainer/set/battle/tick/cursor/fixture lookup. Across all **278** nature-check
boundaries in the three v2 receipts, **267** equal the reducer directly; the
other **11** (case counts **5/2/4**) are each reducer +18 cycles. A fresh
instruction trace placed that +18 at an asynchronous global timing-service
handoff between ordinary Thumb instructions, so every boundary decomposes
exactly into candidate path plus external hardware service. Candidate timing
is therefore resolved; the async workload is not. A fresh wrapped anchor v2
probe was byte-identical (`631bd214…`). Focused **9/9** and typecheck pass.

**Source-return timing (2026-08-10):** `reduceFactorySourceReturnTiming`
replays the two compiled final-loop/epilogue paths using only
`sourceFunction`. The anchor six-mon tail (`0x0819B612→0x0819A9FE`) is exactly
40 source cycles; the LILIANA and varied three-mon tails
(`0x0816376C→0x081635B2`) are exactly 32 each. All **3/3** v2 source-return
spans decompose directly with zero contained VBlank pause and zero residual
hardware-service cycles. Source cites and instruction accounting are in the
v2 receipt; no live wiring or cursor adoption changed.

**Construction-entry timing (2026-08-10):**
`reduceFactoryConstructionEntryTiming` audits both compiled Factory call
sites (`0x0819B5A4` selectable, `0x08163706` trainer-party) and reduces their
shared `CreateMonWithEVSpreadNatureOTID` entry-to-first-`Random` path
(`0x08068634→0x0806F5CC`). The unconditional prologue is **26** sequential
Thumb halfwords (**52** cycles) plus one **6**-cycle BL pipeline refill:
**58** source cycles. All **12/12** v2 spans match directly (anchor/LILIANA/
varied **6/3/3**), with zero fully contained VBlank pause and zero residual
hardware-service cycles. The construction clock now exposes this structural
operation, but remains unwired while the larger costs and async workload below
are unresolved.

**Non-final outer-loop timing (2026-08-10):**
`reduceFactoryOuterLoopTiming` now covers all **9/9** committed
post-mon-end→next-construction-entry spans across both compiled siblings.
`FillFactoryFrontierTrainerParty` is **130** cycles for all four spans
(`27×2 + 2×8 + 3×11 + 3×9`); `CreateFrontierFactorySelectableMons` is **261**
source cycles for all five (`61×2 + 6×8 + 5×11 + 4×9`). Four selectable
spans match directly and one is **261 + 18 = 279**, with the +18 independently
classified as asynchronous timing service between ordinary shift
instructions. All nine contain zero complete VBlank pauses. The selectable
reducer models only source loop index, rental rank, and challenge-number clamp
branches; loaded mon values do not alter timing and `sourceSetId` stays
diagnostic. The clock emits a non-final `factory-outer-loop` operation, but
remains unwired while CreateMon/EV/stat/Factory-post and live VBlank/audio
arbitration remain unresolved.

**EV-spread source-state checkpoint (2026-08-10):** the complete v2
`CreateMon`-return to `CalculateMonStats`-entry boundary is now pinned for all
**12/12** spans (anchor/LILIANA/varied **6/3/3**) after subtracting contained
VBlank pauses. Net range remains **26,672–41,256** cycles; only varied mon 1
contains a complete pause (**36,217** cycles), and all other spans contain
zero. Compiled audit of `0x0806869C→0x08068D0C` proves every selected EV bit
takes `SetMonData→SetBoxMonData`, including decrypt, two checksum passes,
re-encrypt, and **12** `GetSubstruct→__umodsi3(personality,24)` calls. Thus the
smallest missing source input was the full accepted personality, not merely
`evSpread`/`evStatCount` or personality modulo 24; it is now propagated to the
clock's CreateMon/EV/stat/Factory-post operation keys and red-verified. Exact instruction-
fetch/EWRAM access timing was not completed, so no duration reducer or fitted
constant landed, and no +18 service residual is claimed before it can be
separated from that missing compiled timing. See the construction receipt's
EV-spread section. #55 stays open and the clock stays unwired.

**`CalculateMonStats` parent/direct-call checkpoint (2026-08-10):** a fresh,
byte-stable Battle Scene OFF sibling receipt now splits the same **12/12**
entry→return spans (`0x08068D0C→0x080686EA`) into all **40** compiled direct
calls per mon (**480** total): 15 `GetMonData2`, level lookup, 8 writes, 6
divides, 5 nature reads, and 5 nature modifications. After seven fully
contained VBlank pauses, source totals remain **140,999–154,160** cycles;
direct callees account for **139,916–153,077** and parent interstitial is only
**1,081/1,083**. `reduceFactoryCalculateMonStatsParentTiming` now explains all
12 exactly from compiled fetch classes and source-visible species/old-max-HP/
current-HP/new-max-HP state. The split is the u8 `levelUpHP` zero branch at
`0x08068E38`: zero executes two extra halfwords but avoids a six-cycle refill,
net **−2**. Normal nonzero decomposition is
`345×2 + 51×6 + 5×(11−2) + 6×(9−2) = 1,083`; zero is
`347×2 + 50×6 + 5×(11−2) + 6×(9−2) = 1,081`. Source tests also pin Shedinja
and all final-HP branches.

**Nested `ModifyStatByNature` timing (2026-08-10):** the standalone
`reduceFactoryModifyStatByNatureTiming` now walks `pokemon.c:5878-5911` /
`0x0806D8D4→0x0806D932` using only real callee ABI state: valid nature,
stat-index, and incoming u16 stat. It replays the stat-index guard, ROM
nature-table byte, sign branch, u16 product, ARM7TDMI multiply-width class,
and nested `__udivsi3(...,100)` loops. All **60/60** committed calls are exact:
**52×98** neutral, raise **3×416 + 1×418**, lower **3×408 + 1×410**, totaling
**8,396** source cycles. That is **60/480** direct calls (**12.5%**) but only
**0.475%** of their **1,768,691** pause-subtracted cycles, so it is an honest
partial reduction rather than a complete stats claim. A fresh Scene-OFF anchor
repeat remained byte-identical (current extended receipt `92d3feb4…`).

**Nested direct `GetNature` timing (2026-08-10):**
`reduceFactoryGetNatureTiming` now reduces the complete
`0x0806D070→0x0806D088` callee from accepted personality alone: **180** fixed
cycles for field-zero `GetMonData2→GetBoxMonData2`, **42** wrapper cycles, and
the exact personality-dependent `__umodsi3(personality,25)` path. All **60/60**
calls account for **59,900** source cycles (anchor/LILIANA/varied
**29,875/14,830/15,195**). Raw spans are **57×exact + 2×(+18 async service) +
1×(+245 complete VCount/audio IRQ)**; a fresh instruction trace classified the
245-cycle path, and neither external class is folded into the reducer. The
existing **278-call** nature-attempt contract is unchanged; fresh anchor hash
remains byte-identical (current extended receipt `92d3feb4…`).

**Nested direct signed-division timing (2026-08-10, `602227bd`):**
`reduceFactorySignedDivisionTiming` now closes all **72/72** v1 direct
`__divsi3` calls (**6 per mon, 12 mons**) from only signed-i32 dividend/divisor
ABI values. It audits the wrapper's divisor-zero `__div0`, sign/absolute-value
branches, final sign, and inline unsigned Loop1/2/Loop3 core at
`0x082E755C`, factoring only the exact core shared with the distinct
`__udivsi3` body at `0x082E7B68`. Source totals are anchor/LILIANA/varied
**11,252 / 5,630 / 5,700 = 22,582** cycles; all 72 calls contain no complete
VBlank pause. Raw spans are **71 exact + one +18** asynchronous service
residual (anchor mon 3 `11300/100`), which is not folded into the reducer.
The red-first tests also pin negative operands, zero dividend/divisor, and
`INT_MIN / -1` retail wraparound. This resolves **72/480** direct calls but
does not claim the aggregate operation.

**Nested direct `SetMonData` timing (2026-08-10, `d877ab2b`, corrected by
`8789ce5b`):** `reduceFactorySetMonDataTiming` source-reduces all **96/96**
recorded direct party writes from the signed field ID and the compiled
`0x0806ACAC` switch: level field 56 is **72** cycles and HP/stat fields 57–63
are **78** cycles, totaling anchor/LILIANA/varied
**3,708/1,854/1,854 = 7,416** source cycles with every raw span exact. General
switch coverage additionally pins field 55 status-u32 at **86**, field 64
mail-u8 at **72**, and field 65 no-op at **56** cycles. The delegated default
`SetBoxMonData` route exposes only exact 30-cycle entry and 10-cycle return
shells; its encrypted body remains unresolved.

**Nested direct `GetMonData2` timing (2026-08-10, `9a90f094`):** the complete
**180-call** v1 census is 24 direct party reads (fields 57/58), 72 encrypted EV
reads (26–31), 72 encrypted IV reads (39–44), and 12 encrypted species reads
(11). `reduceFactoryGetMonDataTiming` instruction-counts the source-general
simple party jump-table arms from the signed field alone. All **24/24**
receipt-used HP/max-HP calls are exact at **80** cycles, totaling
anchor/LILIANA/varied **960/480/480 = 1,920**, with no contained pause or
async residual. Fresh wrapped Scene-OFF packets for all three cases remain
byte-identical (current extended receipts `92d3feb4…` / `136efa4a…` /
`ea323d9e…`). Encrypted/default
routes retain only exact wrapper shells (**36/12** cycles for the receipt's
compare-default fields; **68/12** for jump-table holes) and `cycles: null`;
Deoxys-stat routes likewise retain exact **68**-cycle entry and **26/42**
return shells without claiming the nested body. Completed direct-call
coverage is now **312/480**, **100,214 / 1,768,691 = 5.666%** of source
callee cycles.

**Direct `GetLevelFromMonExp` checkpoint (2026-08-10, `b8bb8306`):** all
**12/12** calls now carry accepted personality, species, growth rate,
experience, result, and exact post-accessor boundaries in twice-fresh
Scene-OFF receipts. The source/ELF path from EXP-accessor return is exactly
**43 + 21 + 2,200 + 18 = 2,282** source cycles for every level-50 case;
observations decompose **8 exact + 3×(+18 external service) + 1×(+308
VCount→m4aSoundVSync IRQ)**, with no asynchronous cost absorbed. The complete
callee is not reduced: its two encrypted species/EXP accessors contribute
**219,176** observed cycles and still require the unresolved EWRAM
decrypt/checksum/fetch model. Complete-call net totals are
anchor/LILIANA/varied **123,879/61,954/61,089 = 246,922**. No duration table,
identity branch, residual fit, aggregate stats claim, or clock wiring landed.

**Encrypted accessor source composition (2026-08-10, `d7820e25`):** the
**156** direct encrypted reads plus **24** level accessors remain one
source-general dependency: species **24**, EXP **12**, EV-byte **72**, and
IV-bitfield **72**. Tier 1 covers all 24 `personality % 24` routes and all
four substruct types. It now pins the complete 192-byte ELF `__umodsi3`
symbol (`0x082e7be1` Thumb-bit), its three return paths, the `GetSubstruct`
BL/resume shell, and all 96 compiled arms. The narrow `%24` reducer is not
assumed to be the unsigned-division core: its Loop3/ROR correction body is
independently hashed and replayed for every u32 personality.

Each census row source-audits the exact GetBoxMonData2 alias/outer sequence
and CalculateBoxMonChecksum sequence, `[0,1,2,3,0,1,2,3]`, and exposes the
eight complete function timings plus their source-general subtotal. It adds
that subtotal to the fixed **1,174**-cycle decrypt/checksum/encrypt
instruction-fetch segment (328 + 518 + 328), but retains accessor cycles as
`null`. The full-u32 `0xffffffff` example is **6,824** across the eight calls
and **7,998** composed ROM-only cycles; it is an input-derived example, not a
fixture-duration key.

The committed Battle Scene OFF v2 packets remain byte-identical at anchor
`631bd21408ba41e03c0e119dde3d83d94dda023cee93ebc3e470e6d94741cc2a`,
LILIANA `ae1282b74f74de6a85b8772adfbcd83028fad09f8aa3e3ecd518aafeab17b443`,
and varied trainer
`3e10197a34f4ea7a08a23bead04ae5b6113c653304722167095612a9b0626987`
(**242/52/294**, **112/31/143**, **202/30/232**). Their event stream only
exposes interrupt/resume points, while all **156** Scene-OFF stat receipt
boundaries are strictly larger than their known GetMonData shell plus this
ROM-only subtotal after recorded pauses are removed. No residual is absorbed.

**Encrypted EWRAM/tails increment (2026-08-10):** a retail aligned-access
reducer now records byte/halfword at **2** occupancy cycles and word at **4**
occupancy cycles on the 16-bit EWRAM bus; unneeded misalignment is rejected,
not guessed. Elapsed premium is composed per instruction context. The
12-word decrypt/encrypt components are independently exact at **448** each,
and the 24-halfword checksum loop remains **518**; shared bus occupancy is
**528** with a **240**-cycle premium over already-counted instruction
baselines. All 180 dependency rows now expose exact input-derived valid/
invalid checksum tails and species/EXP/EV/IV field tails, including bad-egg
species, with exact PCs, widths, counts, bus totals, and complete component
cycles. A fresh compact Scene-OFF sibling receipt pins the clean mGBA
component joins without pointer/storage data or a production import.

**Synchronous accessor outer-shell increment (2026-08-10, `8aa00042`):** an
explicit typed reducer now closes the remaining `GetBoxMonData2` prologue,
four-call setup, decrypt/checksum call bridges, field jump-table dispatch,
encrypt/common return, plus CalculateBoxMonChecksum's own four-call setup and
return shell. The source/ELF subtotal is **216 + 98 = 314** cycles and excludes
all eight GetSubstruct bodies plus the already-exact decrypt/checksum/encrypt
components, so composed timing has no nested double count. All **180** receipt
rows and a **24×14×2** personality/field/checksum matrix retain input-derived
routes. A fresh Scene-OFF mGBA boundary run pins all eight scattered aligned
personality reads at clean two-cycle instruction joins; the same isolated
composition applies to the receipt-pinned EXP/IV u32 tails, and **77/156** direct
encrypted stats boundaries equal the complete synchronous composition, while
every other observed class remains an unabsorbed boundary/service/IRQ delta.

**Encrypted construction-write reduction (2026-08-11, `11e20187`):** the
complete synchronous `SetMonData→SetBoxMonData` path used by EV construction
is now source-composed from field, aligned EWRAM BoxMon base, accepted
personality, and checksum result. The three committed cases contain **27** EV
writes (`26×10/27×2/28×6/29×0/30×5/31×4`); all six source-reachable fields
26–31 are covered. Valid writes execute **12** GetSubstruct calls, decrypt,
two checksums, field store, and encrypt: fixed cycles excluding the
personality-derived calls are **2,380**, plus the exact **40-cycle** SetMonData
shell. Invalid checksum executes **8** calls and returns before field dispatch
at fixed **1,708**. Tier 1 covers all personality layouts, representative
general switch families, immutability, and fail-closed unsupported/misaligned
inputs. Aggregate EV/stat costs and the live clock remain null/unwired; no
+18/IRQ/VBlank/external work is absorbed. Detailed accounting is in
`docs/issue55-encrypted-accessor-timing-slice.md`.

**Still open:** async +18 service, VBlank/IRQ entry/body/return work, and the
live construction clock. Complete stats/accessor timing remains null and
unwired; no identity/duration table or residual fit landed. Detailed
accounting is in `docs/issue55-encrypted-accessor-timing-slice.md`.

**Recurring +18 census (2026-08-10):** wrapper-validated OFF packets now join
all **85** occurrences by exact source PCs and scalar scheduler/IRQ/DMA/
prefetch state: nature **11**, outer tail **1**, encrypted accessor **67**,
level loop **3**, divide **1**, and `GetNature` **2**, against **488** clean
same-component controls. A missing fixed compiled segment is refuted. Both
groups have no active DMA, IF, or CPU block and have ROM prefetch enabled;
phases vary and scheduler distance overlaps. The exact missing discriminator
is the intra-span instruction timing-event identity/queue state, needed to
separate execution-context overlap from non-IRQ asynchronous service. No +18
reducer landed; the accessor histogram stays
**0×77/+18×67/+117×5/+245×6/+263×1** and both cycle contracts stay null.

**Instruction-queue observable checkpoint (2026-08-10):** the existing probe
now has a bounded opt-in instruction trace selecting the anchor's matched
318-cycle `__divsi3(9300,100)` clean control and `__divsi3(11300,100)` +18
member. Two fresh OFF attempts to read libmgba-py's `mTiming.root` event/name
inside that window exited 139 before JSON; the required wrapper rejected both.
The hook retains no pointer token and leaves its semantic queue field empty.
The exact next missing observable is a safe libmgba API/shim for the due event's
callback name and queue position around one `core.step()`; no +18 timing or
clock wiring is inferred. See the construction schedule receipt.

**Instruction-queue identity BANKED (2026-08-10 late, solo session):** the
shim premise was refuted — the vendored ffi declares `mTiming`/`mTimingEvent`
fully, so a guarded walk suffices (`snapshot_timing_queue()` in the probe;
NULL/link/name-length capped; validated 20,500 walks fault-free and
savestate-inert; the exit-139 is the known teardown crash and reproduces
with zero walks). The packet is banked twice-fresh byte-identical
(`2e3b089c…`, 162,353 bytes, wrapper exit 0) and the frozen v2 anchor still
regenerates at `631bd214…`. Result: the single matched +18 edge
(`0x082e7572→0x082e7574`, clean 2 vs member 20 cycles) crosses a due
**`GBA Timer 0`** event (m4a sample timer) at its queue head; the clean
control's matched edge crosses none. Next: measure the Timer 0 service-cost
class across the 85 census joins with this packet mode, then model
crossings from the source-derivable Timer 0 reload — still no fit, clock
stays unwired. Full detail: construction schedule receipt, "queue identity
BANKED" section.

**All-85 Timer 0 classifier (2026-08-10):** the new opt-in
`FACTORY_RESIDUAL_18_CLASSIFIER_EVIDENCE=1` packet and Tier-1 receipt join all
**85** known +18 members to exactly **488** residual-zero controls across
anchor, LILIANA, and legal varied Scene-OFF construction epochs. Every member
has one minimal instruction increment whose crossed event is **`GBA Timer 0`**;
the observed service classes are **66** plain m4a-sample Timer 0, **16** with
co-due Video, **2** with co-due Audio Sample, and **1** with both. Cross-epoch
clean-edge matching measures +18 for **83/85**. Two encrypted-accessor paths
have no identical clean edge in their same return class and are deliberately
left with null local controls, not filled by a fitted constant: anchor
`0x082e7c94→0x0806a282` (`0x0806a51a→0x08068dca`) and LILIANA
`0x082e7c90→0x082e7c92` (`0x0806a51a→0x08068d9a`). Both still cross only a due
Timer 0 with retained relative queue before/after evidence. Three fresh
wrapper-mediated OFF cases were each rerun from a fresh path; all six compact
JSON outputs were byte-identical. Receipt and exact exception queue distances:
`docs/issue55-construction-rng-schedule-receipt.md` §"Instruction/event
classification". The source-derived scheduler/cost registration is the next
step; production clock wiring remains out of this evidence commit.

**Timer 0 cadence phase and pure registration (2026-08-10):** a separate
wrapper-mediated Battle Scene OFF receipt now snapshots Timer 0 registers,
`timing.globalCycles + cpu.cycles`, and the named queue event's relative due
time at **924** source boundaries across anchor/LILIANA/legal varied. All rows
show `TM0CNT_L=0xFB1A`, `TM0CNT_H=0x0080`, `GBA Timer 0`, priority **32**, and
deduplicated due times separated by exact **1,254** master-cycle multiples.
The source-entry first-due distances are **276 / 403 / 1,145**, so phase is
not source-general and is retained as an explicit seed/unknown rather than a
fixture fit. Fresh repeats are byte-identical; hashes and the reproduction
contract are in `docs/issue55-construction-rng-schedule-receipt.md`.

`factoryConstructionClock.ts` now registers the smallest pure cadence state:
source-derived reload/prescale/period defaults, enabled/unseeded initialization,
explicit-seed enable, disable/reload guards, late-dispatch phase preservation,
multiple crossed-period advancement, and `serviceCostMasterCycles: null`.
Only source-derived m4a reload rates are accepted; unmodeled rates fail
loudly. This remains deliberately unwired: no `runFactoryConstructionClock`
change, no accessor/operation `cycles` population, no 18-cycle cost, and no
co-due Video/Audio collapse.

**Timer 0 FIFO/DMA conditional-refill census (2026-08-11):** the new opt-in
`FACTORY_TIMER0_FIFO_EVIDENCE=1` packet extends the retained source-order
classifier edges across anchor, LILIANA, and legal varied Scene-OFF epochs. It
does not walk a whole epoch or add a timing lookup key; it captures the
smallest mGBA Timer 0, Direct Sound FIFO A/B, DMA1/2, relative queue, and
instruction-edge state at those selected member/control boundaries. The fresh
packet hashes are anchor `fec13d61…`, LILIANA `aa21be0d…`, and varied
`0228b672…`; each case was repeated from a fresh path and all six outputs were
byte-identical. Counts are **126/57/73 = 256** Timer 0 crossings from
**270/127/176** selected traces (**41/19/25** members and **229/108/151**
controls).

The finite hardware census is **85** FIFO-write transitions and **171** DMA
state transitions without a FIFO write (**129** controls + **42** member
rows). Every one of the 85 write rows is exactly one of the previously
censused +18 members: both FIFO write pointers change, neither read pointer
changes, `internalRemaining` is **3→2** for A and B, and the DMA sources stay
`1`/`2`. Both DMA channels are present in every before/after pair with
`0xB640` enabled/repeating 32-bit special-timing FIFO control, fixed
destinations `DMA1→FIFO A` and `DMA2→FIFO B`. Non-refill rows have observed
edge classes `2×143`, `3×2`, `4×1`, `6×2`, `8×22`, `11×1`; refill rows are
`20×75`, `24×2`, `26×7`, `29×1`. Refill co-due classes are **66** none,
**16** Video, **2** Audio Sample, and **1** Video+Audio Sample.

Joining all three clean-control baseline sets yields **83/85 exact +18**
refill deltas. The two unmatched paths remain null rather than fitted:
anchor encrypted-accessor ordinal 25 (`0x082e7c94→0x0806a282`, return
`0x0806a51a→0x08068dca`) and LILIANA ordinal 21
(`0x082e7c90→0x0806a282`, return `0x0806a51a→0x08068d9a`).
The local per-epoch join is 77 `+18` / 8 null,
because six clean classes are supplied by another epoch. This correlation
classifies the observed +18 as conditional on a Direct Sound FIFO refill/DMA
write, not as an invariant Timer 0 callback cost.

**Pure Timer 0 Direct Sound dispatch (2026-08-11, `649e993d`, source-graph
completion `9f13edc7`):** the smallest source-general conditional deadline-work
reducer is registered alongside the pure cadence. Semantic per-crossing inputs
cover the FIFO queued-word threshold, Timer/output routing, DMA
source/custom-timing/enabled eligibility, the global audio-enable gate, and
only fresh four-word IWRAM-to-FIFO work. Every represented DMA requires
explicit zero pre-Timer-0 `nextCount` work, and the reducer requires a caller
assertion of no pre-existing, competing, or Video-started DMA work before it
normalizes the graph. Outputs retain A/DMA1 before B/DMA2 and name the
independent per-channel scheduled-deadline work (10 each; sum 0/10/20). The
pure scheduler graph now follows fresh callback-time rebasing, 2-cycle word
edges, pre-terminal overdue coalescing, ascending-channel arbitration, and
CPU-blocked progression, computing zero/one/dual makespans **0/10/18**. Invalid FIFO
levels, mappings, regions, modes, counts, pending work, ownership, and
per-crossing state-list lengths fail loudly. Multiple late crossings require
one explicit state each and preserve cadence phase. A standalone reducer takes
actual dispatch time and the common `currentTime - cyclesLate` deadline, so
late isolated graphs translate without a fixture/tick lookup. Tier-1 covers
the graph order/overlap, 20 work versus 18 dual elapsed, zero/one, lateness,
audio disabled, pending/competing/Video rejection, immutability, source hashes/
anchors, repeated crossings, and validation.

This closes the pure conditional dispatcher only. #55 remains open for live
construction-clock phase/workload composition and complete VBlank/IRQ/audio
arbitration. `serviceCostMasterCycles` stays `null`; no fitted 18 constant,
co-due Video/Audio service, operation/accessor duration, or
`runFactoryConstructionClock` wiring landed. Source/runtime evidence remains
in `docs/issue55-mgba0105-timer0-direct-sound-audit.md` and
`docs/issue55-mgba0105-timer0-scheduler-audit.md`.

**Absolute Timer 0 callback-entry boundary (2026-08-11):** the existing mGBA
probe now transparently wraps and delegates live timing callbacks during the
anchor construction epoch. Two fresh OFF runs are byte-identical
(`475f4731…`) and retain one isolated dual refill plus one exact Video-co-due
contrast. Timer enters on time at absolute scheduler deadline/current
**1,880,434,111** (isolated) and **1,880,414,047** (Video priority 8 first,
then Timer priority 32), both `cyclesLate=0`. Audio is enabled, mixer absent,
all DMA0–3 state is retained, all `nextCount=0`, and neither pre-existing nor
Video-started DMA exists. Timer requests A/DMA1 then B/DMA2; callback order is
`1,1,1,1,2,1,2,2,2,2`, completion order is 1→2, and both graphs finish at
**entry +18** with `activeDMA=-1`. DMA2's first word overlaps DMA1's terminal
+2 deadline: 20 is summed per-channel work while 18 is live graph makespan.
The original 20-cycle instruction edge is 2 CPU + 18 blocked scheduler cycles,
not a Timer callback cost.

#55 remains open beyond this bounded class: a present mixer, pending/competing
DMA, and external Audio/IRQ or Video-started DMA callbacks remain outside the
reducer. `serviceCostMasterCycles` remains `null`; the construction clock stays
unwired. Full facts are in the scheduler audit.

**Adjacent Audio/Timer row correction + LILIANA runtime receipt
(2026-08-11):** the three natural OFF rows cross adjacent deadlines, not an
equal-deadline Audio-before-Timer class. In each, Timer is due at D and Audio
at D+1; LILIANA is encrypted-accessor ordinal 23. A specialized wrapper now
selects that accessor's zero-based division-loop occurrence 27, installs while
both deadlines are future, retains only from `0x082e7c3e`, and restores after
DMA completion. Two fresh compact packets are byte-identical (`a0cdb0c1…`):
Timer@D (`cyclesLate=1`), DMA1's first callback, Audio@D+1 (`cyclesLate=0`),
then the remaining DMA1/2 graph; requests and completions are both 1→2 and all
hardware state is retained at the exact boundaries. The two legal-varied rows
use generalized source-order selectors. Get-nature ordinal 12 is now captured
twice fresh and byte-identical (`21ea4158…`): Timer@D (`cyclesLate=5`), DMA1,
Audio@D+1 (`cyclesLate=4`), remaining DMA1/2, completion 1→2 at Timer-entry
+18, with prompt restoration. Nature-attempt ordinal 63 is likewise twice
fresh and byte-identical (`d32aa8d8…`): Video@D then Timer@D (both late 6),
DMA1, Audio@D+1 (late 5), remaining DMA1/2, completion +18 and restoration.
Video schedules no DMA. All three natural adjacent rows are closed;
dispatcher/service cost/clock remain untouched.

**IRQ / Video-DMA reachability audit (2026-08-11):** source plus the finite OFF
receipts exclude those roots from the selected construction epoch. MP2K starts
Timer0 with `TM0CNT_H=0x0080` (enabled, IRQ bit clear), matching all **256/256**
crossings. The exact Video-co-due window leaves DMA0–3 `nextCount=0`, and all
**113/113** construction VBlanks have no HBlank callback, inactive scanline
DMA, and an empty/unlocked DMA3 software queue. DMA3 remains source-reachable
as CPU-triggered `START_NOW` VBlank work in other states, not as a Video
callback child here. Full extraction and provenance are in
`docs/issue55-timer0-irq-video-dma3-reachability-audit.md`.

**VBlank workload receipt (2026-08-10, `6df4fc19`):** the opt-in source-state
probe and generated `docs/issue55-vblank-workload-receipt.md` decompose all
**52/31/30** construction-epoch interrupts. Within each case every measured
VBlank-body stage except `m4aSoundMain` is constant; audio alone spans
**23,920–52,083 / 24,732–47,917 / 24,391–41,682** cycles and accounts for the
entire body variation. GPU/DMA queue shapes are constant. Return-to-resume is
**41** cycles for **112/113** samples; one varied sample is **59** cycles, with
no HBlank, VCount, Serial, Timer3, or shared `IntrDummy` ROM ISR entry observed.
The receipt therefore narrows the remaining contract to complete dereferenced
m4a state plus hardware interrupt-resume arbitration; it deliberately does
not claim that the partial audio snapshot is an exact reducer. Compact raw
receipts use relative timing/source state only and existing v2 files remained
byte-identical.

**Internal m4a receipt (2026-08-10, `236e1fe4`):** six fresh runs add a
versioned sibling packet that splits all **113** audio calls at compiled
`SoundMain`, linked `MPlayMain`, `CgbSound`, and runtime-copied
`SoundMainRAM` boundaries. The first five player spans are fixed at **55**
cycles; player six, CGB sound, and the five direct-sound channel passes carry
the observed variation. The bounded address-free state inventory includes
track/channel scalar regions and command/tone/wave prefixes, but all **113**
captured keys are unique, with zero repeated equal-state observations. It
therefore licenses no reducer: the next evidence requirement is repeated,
complete source-state equivalence, not a case or frame lookup. The outer
VBlank v1 and construction v2 byte contracts remain unchanged.

**Extended m4a source-state receipt (2026-08-10, `28f7a5c8`):** a separate v3
probe now captures full fixed SoundInfo/player/track/channel/CGB structs with
pointer bytes normalized, reachable graph state, complete readable wave and
PCM regions by digest, wider command/pattern/tone windows, dispatch targets,
and relevant audio I/O state. Two fresh Scene-OFF runs per case are byte-
identical: all **113** captured keys repeat with **0** unequal m4a costs. The
packet contains no frame, tick, RNG cursor, address, construction identity, or
absolute-cycle lookup. This remains an evidence boundary, not a reducer:
The v3 packet's `coverage.complete` is false for four residual dereference classes covering
handler-dependent/unbounded MPlayMain command and callback reads, transitive
CgbSound callback reads, and malformed/dynamic SoundMainRAM sample targets.
The next admissible audio step is a complete instruction-traced indirect-read
contract or controlled repeated cross-state equivalence—not a state-duration
table. See `docs/issue55-m4a-source-state-receipt-v3.md`.

**CgbSound callback/read closure (2026-08-10, `d55da1ac`):** a direct-emitted
compact v2 packet closes one of those four classes source-generally: all
**11** `CgbOscOff`/`MidiKeyToCgbFreq` paths plus complete fixed table sizes and
digests are mechanically pinned. Two fresh Scene-OFF runs per case reproduce
**52/31/30 = 113** exact v3-state-digest/m4a-cost joins with **0** unequal
costs. The committed evidence is **48,062 bytes** total; the provisional
~26 MB duplicated state packets were squash-excluded from master history.
This licenses no duration reducer. Three dereference classes remain explicit:
two `MPlayMain` handler/callback read classes and malformed/dynamic
`SoundMainRAM` sample targets. See
`docs/issue55-m4a-cgb-callback-receipt-v2.md`.

**MPlayMain callback/read closure (2026-08-10, `a56341fb`):** a compact v2
packet closes the callback-transitive class source-generally: all **36**
`gMPlayJumpTable` slots and **14** `gXcmdTable` slots are pinned to their
source/ELF targets and read/write audits, including `ply_xcmd` and `ply_xxx`
edges. Two fresh Scene-OFF runs per case reproduce **52/31/30 = 113** exact
v3-state-digest/m4a-cost joins with **0** unequal costs. The additive fixtures
total **136 KB**, contain no duplicate v3 graphs or identity/duration keys,
and license no duration reducer. Two dereference classes remain: the unbounded
command/pattern source window and malformed/dynamic `SoundMainRAM` sample
targets. See `docs/issue55-m4a-mplay-callback-receipt-v2.md`.

**SoundMainRAM pre-call target audit (2026-08-11, `38476663`):** a hermetic
source/ELF extractor inventories **13** target-producing branches and **4**
read/range rules. Across the committed v3 cases, **565** selected-channel
snapshots / **113** VBlank observations map to **5** pinned WaveData assets;
every retained pre-call target has a complete payload, valid current/count
relation, and the required linear-path guard bytes. This closes the static
pre-`MPlayMain` target-content inventory without a new oracle run.

It does **not** close the actual mixer-entry target class: v3 snapshots before
six `MPlayMain` calls, whose `ply_note` and dynamic `ply_xwave` paths may
replace channel targets before `SoundMainRAM`. The exact next observable is an
address-free `soundMainRamEntryTargets` descriptor at
`sound-main-ram-entry`, including current relation, complete sample region,
bus/storage role, alignment, and physical payload length. No duration reducer
or production clock wiring is licensed. Full evidence:
`docs/issue55-m4a-soundmainram-target-audit-v1.md`.

**SoundMainRAM actual-entry target-safety closure (2026-08-11,
`07a572e8`):** an additive v1 packet now captures the requested address-free
descriptor at the existing `sound-main-ram-entry` hook, after all six
`MPlayMain` calls and `CgbSound`, before channel 0. Two fresh serial OFF runs
per anchor/LILIANA/legal-varied case are byte-identical (receipt hashes
`6b29d708…` / `780e3326…` / `202f18b6…`) and mechanically join all
**113/113** v3 state-digest/cost rows with **0** unequal costs plus the frozen
**13-branch / 4-rule** audit. All **565/565** selected slots have complete
declared and physical sample-region digests, aligned readable `gamepak-ws0`
storage, exact START-or-persisted current relations, and sufficient
fixed/linear guard bytes; no CMP, REV, compressed, unreadable, unaligned, or
incomplete row occurs. Thus the observed actual-entry target-safety class is
closed.

**MPlay mixer-entry provenance closure (2026-08-11):** an additive v2 packet
joins the exact final `ply_note` `SoundChannel.wav` writer to all **13/13**
MPlay replacements with **0** ambiguous joins. Exact symbol-relative selector
and store boundaries classify **6 inline / 0 keysplit / 7 rhythm**; all six
inline rows retain the same-pass ancestry verdict and prove **0/6**
`ply_xwave.command-u32` writers. Anchor/LILIANA compact receipts reproduced
twice byte-identically (`afcb8034…` / `b5cda911…`); legal-varied's frozen zero-
replacement receipt required no new run. Thus the actual-entry target safety
and mutable-route provenance classes are both complete for all **565** selected
slots. No duration reducer, service cost, or clock wiring is licensed. See
`docs/issue55-m4a-mixer-entry-provenance-v2.md`.

**MPlayMain command/pattern read-bound closure (2026-08-11):** a hermetic v1
contract reuses the byte-identical v3 fixtures and pinned ROM/ELF without an
oracle run. Of **1,130** sixth-player track snapshots, **1,017** are active;
**917** have `wait>0` and cannot read command bytes in the single possible
tempo pass, while all **100/100** wait-zero candidates replay to a bounded
wait/fine outcome with **0** incomplete, **90** distinct read sets, and maxima
of **5 commands / 11 byte reads**. Current commands, active pattern returns,
and every encoded GOTO/PATT/REPT destination normalize to one of nine
`mus_b_factory_N` roles with checked offsets, lengths, and digests. Malformed
stacks, recursive control, unknown commands/selectors, unavailable bounds, and
MEMACC without bounded mutable state fail closed.

This closes the formerly unbounded dereference class as a complete safety/read
superset, and isolated one exact selector defect in v3: its
`PLAYER_POINTER_FIELDS` zeroes MusicPlayerInfo bytes `0x20..0x23`
(`tempoI`/`tempoC`) while leaving the actual `memAccArea` pointer at
`0x18..0x1b` in `scalarBytes`. The live source invariant and retained
`tempoD=144`/`tempoU=256` prove at most one pass, so replaying every wait-zero
candidate covers all reads; v3 alone cannot choose zero versus one pass for a
cost reducer. Do not alter the preserved v3 receipt or infer that selector.
Evidence:
`docs/issue55-m4a-command-read-contract-v1.md`.

**Sixth-player scalar selector closure (2026-08-11):** an additive v1 OFF
packet captures `MusicPlayerInfo+0x18..0x23` at the exact sixth `MPlayMain`
entry, zero-normalizing the real `memAccArea` pointer while preserving live
`tempoD/U/I/C`. Two serial fresh captures per anchor/LILIANA/legal-varied case
are byte-identical. The source rule `tempoC + tempoI >= 150` mechanically joins
all **113/113** frozen v3 state-digest/sixth-cost rows and classifies **108 one-
pass / 5 zero-pass** calls (anchor **49/3**, LILIANA **30/1**, varied **29/1**).
All prior v3 hashes remain unchanged. This closes only the exact selector;
there is still no duration reducer, service cost, or clock wiring. Evidence:
`docs/issue55-m4a-player-selector-v1.md`.

**Swap-ball exposure (2026-08-10):** source-exact per-ball callback/RNG
threading now makes the first post-cycle pixel boundary observe this debt.
The WIN YES fixture's real first callback cursor/outcomes are
`0xA77397C1`, failure/success/failure; the current synthetic live stream is
`0x8FF192D9`, failure/success/success. Publishing an adopted construction
endpoint at GO ON was tested and rejected: it double-counts the 31 ambient
VBlanks already interleaved within LILIANA's 32-frame C call, exactly the
v2 refutation above. No fitted cursor, per-frame schedule, or construction-
clock wiring was landed. The canonical window therefore remains 248/248
through 10177; its attempted 10214 extension is 277/285, ball 2 only.

**Lead (updated 2026-08-13):** the cycle-pricing program is PARKED per the
2026-08-13 user decision at the head of this entry; schedule no further
pricing slices. Live generation wires the clean-stream contract, with
personality-exactness versus hardware documented as out of model when
construction spans more than one frame — distribution parity is the
accepted bar. Per-mon cursors and per-frame fixture schedules remain
evidence-refuted as production designs; captured/adopted seeds remain the
only byte-exact route. If the program is ever re-authorized, resume from
the CGB4 v44 checkpoint — every receipt stands and regenerates.
Supervisor decision 2026-07-30 (entry 758):
Gate-5 clause (a) is receipt-linked at the rules level (selection byte-exact
from the probed cursor; construction proven via filtered ledger); this entry
tracks the remaining stream-model boundary, not a Gate-5 blocker.

**2026-08-11 MPlay execution frontier:** an additive source audit now joins all
**113/113** frozen sixth-player rows by `sourceStateDigest`. All **5/5**
zero-pass calls close exactly at 864 cycles. The **108** one-pass calls stay
null because the frozen entry/final-target packets do not contain the mutable
post-command `Track.flags`/`chan` state consumed by MPlayMain's volume/pitch
loop. No duration was fit, no service cost was assigned, and the construction
clock remains unwired. Next capture/reduce that post-command state.

**2026-08-11 post-command state closure:** additive OFF packets now capture
the exact sixth-player `_081DD9C4` boundary and join all **113/113** rows by
`sourceStateDigest`, including **108/108** one-pass calls. Two fresh serial
runs per anchor/LILIANA/legal-varied case are byte-identical (`8ff491a1…` /
`d3d29caa…` / `ab887a51…`). Every row has nine `MPT_FLG_EXIST`-only tracks
(`0x80`) plus one inactive track, so no row selects `TrkVolPitSet` or the
following channel-chain worker. The mutable post-command `Track.flags`/`chan`
discriminator is therefore closed source-generally.

Complete costs remain **5 exact / 108 null**. The next discriminator moved
earlier to source timing for the one-pass tempo track/command loop, including
channel gate/clear, wait/LFO, and bounded command-callback paths. No observed
duration was fit, no service cost was assigned, and the construction clock
remains unwired. Evidence: `docs/issue55-m4a-post-command-v1.md`.

**2026-08-11 one-pass channel-gate subset closure:** additive OFF packets now
capture the sixth player's exact compiled `_081DD874` boundary for all
**108/108** one-pass rows; the five zero-pass calls correctly never reach it.
Two fresh serial anchor/LILIANA/legal-varied captures are byte-identical
(`6f0884ff…` / `6650f3fb…` / `6e371fa2…`) and retain only active track flags
plus address-free channel role, `statusFlags`, and `gateTime`. The source/ELF
reducer walks **768** channel members and independently instruction-counts the
empty-chain and `gateTime` 0/1/>1 paths. **69/108** one-pass rows never select
`ClearChain` and now have exact channel-gate components (**204–398** cycles,
36 distinct totals). The other **39/108** rows select **47** `ClearChain`
callbacks and remain null for this component because track/previous/next link
state is not yet captured at callback entry.

Complete MPlay costs remain **5 exact / 108 null**. The next discriminator is
the 39-row `ClearChain` entry link state; wait/LFO and bounded command-callback
timing remain later for all one-pass rows. No observed duration was fit, no
service cost was assigned, and `runFactoryConstructionClock` remains unwired.
Evidence: `docs/issue55-m4a-channel-gate-v1.md`.

**2026-08-11 ClearChain channel-gate closure:** additive OFF packets now
capture address-free current/track/previous/next link roles at the compiled
`ClearChain` wrapper entry, accepting only the `_081DD8AE` MPlay gate
callsite. Two fresh serial anchor/LILIANA/legal-varied captures are
byte-identical (`6c1cbae4…` / `002f134d…` / `fd540906…`) and join all
**47/47** callbacks across the prior **39/108** null one-pass rows. The three
observed routes are previous-null/next-null **23×87** cycles,
previous-linked/next-null **19×89**, and previous-linked/next-linked **5×85**.
The pinned wrapper, indirect trampoline, and `RealClearChain` reducer therefore
close the complete channel-gate component for **108/108** one-pass rows
(**204–613** cycles, 70 totals), without an observed-duration fit or pointer
identity table.

Complete MPlay costs remain **5 exact / 108 null**. The next discriminator is
one bounded earlier per-track component: wait/LFO or a bounded command-callback
family. No service cost was assigned, no later component was inferred, and
`runFactoryConstructionClock` remains unwired. Evidence:
`docs/issue55-m4a-clearchain-v1.md`.

**2026-08-11 per-track wait/LFO mod-zero closure:** additive OFF packets now
capture only address-free track index plus mutable `wait`, `lfoSpeed`, and
`mod` bytes at the sixth player's exact compiled `_081DD938` boundary. Two
fresh serial anchor/LILIANA/legal-varied captures are byte-identical
(`b0509335…` / `acf844d6…` / `1ff1a524…`) and join all **113/113** frozen
rows without ambiguity. The five zero-pass calls never reach the boundary;
all **972/972** active-track visits in the **108/108** one-pass rows have a
nonzero final wait, nonzero LFO speed, and `mod == 0`.

The pinned 22-byte ELF route therefore closes at **28 cycles/track** and
**252 cycles/one-pass row**. Combined with the already-closed channel gate,
the two known components total **456–865** cycles (70 totals). Complete MPlay
costs remain **5 exact / 108 null**: bounded command dispatch/callback paths
are the next discriminator, while every unresolved callback and later
nonzero-modulation route stays null. No observed duration or pointer identity
was used, no service cost was assigned, and `runFactoryConstructionClock`
remains unwired. Evidence: `docs/issue55-m4a-wait-lfo-v1.md`.

**2026-08-11 `ply_pend` callback-family closure:** the smallest nonempty
sixth-player callback family is now source-exact. Additive OFF packets capture
only track index, `patternLevel`, and a normalized pattern-return role/offset
at the exact compiled `ply_pend` entry. Two fresh serial runs per anchor,
LILIANA, and legal-varied case are byte-identical (`ccaf8b53…` / `eb925d3a…`
/ `c22d9302…`). Across all **108/108** one-pass rows there is exactly **1/1**
`ply_pend` callback (anchor track 6); it selects the empty-pattern-stack route
at **20 cycles**. The source-general nonempty route is independently counted
at **30 cycles** but is not claimed as observed.

Complete MPlay costs remain **5 exact / 108 null**. The next discriminator is
the command decode/jump-table dispatcher or one of the remaining live
`ply_patt`, `ply_voice`, `ply_vol`, `ply_pan`, `ply_bend`, and note families.
No observed duration, pointer identity, service cost, or clock wiring landed.
Evidence: `docs/issue55-m4a-pend-v1.md`.

**2026-08-11 `ply_patt` callback-family closure:** additive OFF packets now
capture only track index, `patternLevel`, and normalized command-payload,
return, and pattern-target source offsets at the exact compiled `ply_patt`
entry. Two fresh serial runs per anchor/LILIANA/legal-varied case are
byte-identical (`44264459…` / `690dc18b…` / `929365a4…`) and join all
**113/113** frozen rows. Across the **108/108** one-pass rows there is exactly
**1/1** callback (anchor track 6, depth 0): the pinned `ply_patt -> ply_goto ->
ldrb_r3_r2/chk_adr_r2` route is **134 cycles**. Depths 0–2 share that source
route; malformed normalized state and the unobserved full-stack `ply_fine`
teardown route fail closed.

Complete MPlay costs remain **5 exact / 108 null**. The next discriminator is
the command decode/jump-table dispatcher or one remaining live `ply_voice`,
`ply_vol`, `ply_pan`, `ply_bend`, or note family. No observed duration,
pointer identity, service cost, or clock wiring landed. Evidence:
`docs/issue55-m4a-patt-v1.md`.

**2026-08-11 `ply_voice` callback-family closure:** additive OFF packets now
capture only track index, normalized command source, voice index, and the
normalized `voicegroup_b_factory` table/entry relation at the exact compiled
`ply_voice` entry. Two fresh serial anchor/LILIANA/legal-varied captures are
byte-identical (`036123ca…` / `b35b16c3…` / `0aeae1bc…`) and join all
**113/113** frozen rows. Across the **108/108** one-pass rows there are exactly
**2/2** callbacks: anchor track 1 selects voice 87/tone offset 1044, and varied
track 4 selects voice 93/tone offset 1116; LILIANA selects none. Both traverse
the complete pinned `ply_voice` plus three `chk_adr_r2` GamePak fast-accept
routes at **182 cycles each**. Other tone tables, malformed source offsets,
voice ranges, and tone-entry relations fail closed.

Complete MPlay costs remain **5 exact / 108 null**. The next discriminator is
the command decode/jump-table dispatcher or one remaining live `ply_vol`,
`ply_pan`, `ply_bend`, or note family. No observed duration, pointer identity,
service cost, or clock wiring landed. Evidence:
`docs/issue55-m4a-voice-v1.md`.

**2026-08-11 `ply_bend` callback-family closure:** additive OFF packets now
capture only track index, normalized command source, parameter byte, and
pre-callback flags at the exact compiled `ply_bend` entry. Two fresh serial
anchor/LILIANA/legal-varied captures are byte-identical (`5a3377c9…` /
`84081a60…` / `1c336700…`) and join all **113/113** frozen rows. Across the
**108/108** one-pass rows there are exactly **4/4** callbacks, all in two
anchor rows: one callback with parameter 66, then three with parameter 64.

All four select the complete `ply_bend -> ld_r3_tp_adr_i -> chk_adr_r2`
GamePak fast-accept route at **81 cycles** each. The pure reducer pins the
20-byte callback, 10-byte loader, and transitive guard from source/ELF and
fails closed outside normalized song offsets and u8 inputs. Complete MPlay
costs remain **5 exact / 108 null**. The next discriminator is the command
decode/jump-table dispatcher or one remaining live `ply_pan`, `ply_vol`, or
note family. No observed duration, pointer identity, service cost, or clock
wiring landed. Evidence: `docs/issue55-m4a-bend-v1.md`.

**2026-08-11 `ply_pan` callback-family closure:** additive OFF packets capture
only track index, normalized command source, parameter byte, and pre-callback
flags at the exact compiled `ply_pan` entry. Two fresh serial
anchor/LILIANA/legal-varied captures are byte-identical (`35b9e20c…` /
`1089ace5…` / `1eee75f0…`) and join all **113/113** frozen rows. Across the
**108/108** one-pass rows there are exactly **13/13** callbacks: anchor
**5** across four rows, LILIANA **4** across three, and legal-varied **4**
across two.

All 13 select the complete `ply_pan -> ld_r3_tp_adr_i -> chk_adr_r2`
GamePak command-byte fast-accept route at **81 cycles** each. The pure reducer
pins the 20-byte callback, 10-byte loader, and transitive guard from source/ELF
and fails closed outside normalized song offsets and u8 callback inputs.
Joined source-exact one-pass components now span **456–1255** cycles (71
totals). Complete MPlay costs remain **5 exact / 108 null**. The next-smallest
live callback family is `ply_vol` at 16; command dispatch and note families
also remain unresolved. No observed duration, pointer identity, service cost,
or clock wiring landed. Evidence: `docs/issue55-m4a-pan-v1.md`.

**2026-08-11 `ply_vol` callback-family closure:** additive OFF packets capture
only track index, normalized command source, parameter byte, and pre-callback
flags at the exact compiled `ply_vol` entry. Two fresh serial
anchor/LILIANA/legal-varied captures are byte-identical (`0d37f852…` /
`9638d5f9…` / `72fbf177…`) and join all **113/113** frozen rows. Across the
**108/108** one-pass rows there are exactly **16/16** callbacks: anchor
**2** in one row, LILIANA **13** across eleven, and legal-varied **1** in one.

All 16 select the complete `ply_vol -> ld_r3_tp_adr_i -> chk_adr_r2`
GamePak command-byte fast-accept route at **79 cycles** each. The pure reducer
pins the 18-byte callback, 10-byte loader, and transitive guard from source/ELF
and fails closed outside normalized song offsets and u8 callback inputs.
Joined source-exact one-pass components now span **456–1413** cycles (73
totals). Complete MPlay costs remain **5 exact / 108 null**. The remaining
discriminators are command decode/jump-table dispatch and note callback
families. No observed duration, pointer identity, service cost, or clock
wiring landed. Evidence: `docs/issue55-m4a-vol-v1.md`.

**2026-08-11 `ply_note` route census + rhythm-prefix closure:** additive OFF
packets capture the exact compiled `ply_note` entry and three selector
boundaries. Twice-fresh anchor/LILIANA/legal-varied packets are byte-identical
and join all **113/113** rows address-free. The **108** one-pass rows execute
**82 callbacks: 57 inline / 25 rhythm / 0 keysplit** (case totals
**33/24/25**); source tone-type tests independently predict every selector.
The smallest rhythm family is source-exact from entry through tone selection:
all 25 use track 6, `toneType=0x80`, and MIDI-key-indexed FRLG drumset entries
36/54. Two zero-parameter routes cost **193** cycles; 23 key+velocity routes
cost **231**, from compiled instructions/refills and ROM/EWRAM access classes.

Only this prefix is closed. The **57** inline selectors, every post-selection
note body, command decode/jump-table dispatch, complete note costs, and
complete one-pass MPlay totals remain null (**5 exact / 108 null**). No
observed duration, pointer identity, service cost, or construction-clock
wiring landed. Evidence: `docs/issue55-m4a-note-census-v1.md`.

**2026-08-11 `ply_note` inline-prefix closure:** the committed address-free
census proves one inline selector family with three observed parameter
subroutes. All **57/57** callbacks have `toneType & 0xc0 == 0`, retain the
track's inline ToneData, and reach the same `_081DDB9C` join: **3** zero-byte
callbacks cost **108** cycles, **41** key-only callbacks cost **129**, and
**13** key+velocity callbacks cost **146**. The reducer replays pinned song
bytes and scalar key/velocity/tone state, and counts the exact compiled
instructions, taken refills, ROM literals, aligned EWRAM words, and GamePak
byte reads; source/ELF and malformed-route mutations fail closed.

All **82/82** observed tone-selection prefixes are now source-exact. Known
one-pass components span **456–2160** cycles (**84** totals), but every
post-selection note body, keysplit route, command decode/jump-table dispatch,
complete note callback cost, and complete one-pass MPlay total remains null
(**5 exact / 108 null**). No observed duration, runtime pointer identity,
service cost, or `runFactoryConstructionClock` wiring landed. Evidence remains
`docs/issue55-m4a-note-census-v1.md`.

**2026-08-11 command decode/running-status/jump-table closure:** the committed
exact execution selector removes the command-read safety superset's one
zero-pass candidate, leaving **218/218** executed dispatcher iterations across
**40** rows and closing the component for all **108/108** one-pass rows. The
source-exact census is **99** wait stores, **82** `ply_note` dispatches, and
**37** jump-table callbacks (`patt 1 / pend 1 / voice 2 / vol 16 / pan 13 /
bend 4`), exactly agreeing with the independent note and callback-family
evidence.

The six compiled routes cost **63 / 71 / 81 / 85 / 89 / 93** cycles and total
**17,066** cycles: **4,069** WS0 Thumb halfwords, **792** taken refills,
**533** aligned EWRAM words, **99** ROM literals, and **317** GamePak bytes.
The reducer pins normalized song offsets/bytes, running status, table indices,
target symbols, the 88-byte dispatcher, `call_r3`, and the 36-slot jump table;
source/route/state/target mutations fail closed. Known one-pass components now
span **456–4170** cycles (**87** totals).

This closes only `_081DD8E0` through the wait store or selected callback entry.
Every post-selection note body, the unobserved keysplit route, complete note
callback cost, post-callback loop glue, later MPlay component, and complete
one-pass MPlay total remains null (**5 exact / 108 null**). No observed
duration, runtime pointer identity, service cost, unsupported barrier, or
`runFactoryConstructionClock` wiring landed. Evidence:
`docs/issue55-m4a-dispatch-v1.md`.

**2026-08-11 post-selection CGB-channel-4 allocation-prefix closure:** the
committed address-free note packets join source-state v3 for all **113/113**
rows; frozen exact dispatcher evidence proves no intervening `ply_prio`
callback, and mixer-entry provenance remains unchanged. The smallest observed
post-selection family is **7/82** callbacks (**0** anchor / **3** LILIANA /
**4** legal-varied): selected tone type **12** takes `type & 7 == 4`, choosing
CGB channel index 3.

The exact `_081DDB9C`-through-channel-pointer prefix executes **21** Thumb
halfwords, **2** taken refills, **2 IWRAM word reads + 3 stores**, **3 EWRAM
byte reads + 1 word read**, and no GamePak data reads: **62 cycles each / 434
total**. Player/track priorities are both zero and the normalized CGB array has
four channels. Source/ROM/input/provenance mutations fail closed.

Closure stops before the first mutable `CgbChannel.statusFlags` read because
the committed packets do not snapshot that state per callback. The other
**75** post-selection callbacks, the CGB status/priority body, all **82**
complete note costs, keysplit, post-callback glue, all complete one-pass MPlay
totals (**5 exact / 108 null**), service cost, and
`runFactoryConstructionClock` remain null. Evidence:
`docs/issue55-m4a-note-body-cgb4-v1.md`.

**2026-08-11 CGB4 mutable/allocation/helper closure:** twice-fresh
address-free Battle Scene OFF packets close the same **7/82** callbacks through
priority/status selection, `ClearChain`, ownership relinking, and the
`lfoDelayC` zero-delay branch, plus a separate post-prologue `TrkVolPitSet`
component. The
mutable continuation contributes **154** cycles; the allocation body **825**;
the helper contributes **556** (**5 × 56** flags-clear and **2 × 138** observed
VOLSET), for **1,969** known component cycles across the seven
rows. The v4 packets are byte-identical twice per case: anchor
`fbe6a35f…`, LILIANA `4f2e86fe…`, legal-varied `64ea0a16…`. Evidence:
`docs/issue55-m4a-note-body-cgb4-v2.md`,
`docs/issue55-m4a-note-body-cgb4-v3.md`, and
`docs/issue55-m4a-note-body-cgb4-v4.md`.

**2026-08-12 CGB4 caller/prologue closure:** the additive v5 receipt
(`docs/issue55-m4a-note-body-cgb4-v5.md`, generated by
`tools/report/factory-m4a-note-body-cgb4-v5.ts`) source-counts the exact
`_081DDC66` argument setup + `BL TrkVolPitSet` edge at **14** cycles and the
complete `TrkVolPitSet` `push {r4, lr}` prologue at **2** cycles. It uses the
pinned source, ELF/ROM regions, ARM7TDMI sequential Thumb/refill classes, and
IWRAM stack access classes; no new runtime operand or pointer is captured.
Across the same **7/82** address-free joined callbacks this closes **112**
gap cycles, so the source-exact prefix is now **2,081 contiguous cycles**
through the helper return. The prior **1,969** remains explicitly named as
the pre-gap known-component sum, not the contiguous prefix. The seven rows
retain `laterAllocationFieldsSourceCycles: null`; no later allocation field is
priced.

**2026-08-12 CGB4 post-helper allocation-field closure:** the additive v6
receipt (`docs/issue55-m4a-note-body-cgb4-v6.md`, generated by
`tools/report/factory-m4a-note-body-cgb4-v6.ts`) independently regenerates v5
byte-for-byte and reuses its same address-free `sourceStateDigest` rows. From
caller resume `0x082dfea6`, the straight-line gateTime/priority/key/rhythmPan,
ToneData type/wav/attack, and pseudoEchoVolume copies cost **44** cycles per
callback: **17** sequential Thumb halfwords plus five EWRAM reads at the
pinned two-cycle access premium. The exact two-halfword `BL ChnVolSetAsm`
caller edge adds **10** cycles (one taken refill), ending at the unresolved
helper's entry. No new runtime operand, pointer, or mutable scalar was
captured.

Across the same **7/82** zero-lfoDelay CGB4 callbacks, this closes **308**
field-copy cycles plus **70** caller-edge cycles, extending the contiguous
source-exact prefix from **2,081** through `TrkVolPitSet` return to **2,459**
cycles through `ChnVolSetAsm` entry. The seven rows keep later allocation
fields explicit null; the v6 fixture is
`tests/fixtures/factory-m4a-note-body-cgb4-evidence-v6.json`.

**2026-08-12 CGB4 `ChnVolSetAsm` closure:** path B was required because frozen
v3-v6 state lacked the helper's four scalar operands. The additive v7 packet
captures only `velocity`, signed `rhythmPan`, `volMR`, and `volML` at exact
helper entry, with no address, frame, duration, identity, or result byte. Two
fresh Scene-OFF runs are byte-identical per case (anchor `a2f62e3b…`, LILIANA
`53db7226…`, varied `406586b9…`). All **7/82** callbacks take both unsigned
unclamped branches. The complete route executes 22 Thumb halfwords, three
taken refills, two EWRAM-read premiums, and two ARM7TDMI multiply-internal
premium cycles: **68 cycles each / 476 total**. This extends the contiguous
prefix from **2,459** at helper entry to **2,935 cycles** through `bx lr`.
Evidence: `docs/issue55-m4a-note-body-cgb4-v7.md`.

**2026-08-12 CGB4 post-helper caller-field closure:** additive v8 packets
preserve v7 byte-for-byte and capture only signed `keyM` at the exact
pipelined `bpl` boundary `0x082dfed6`, gated by the live ChnVolSetAsm return
callsite. Two fresh Battle Scene OFF runs per anchor/LILIANA/legal-varied case
are byte-identical (anchor `e9c67695…`, LILIANA `80450910…`, varied
`ff77f6e1…`); the same **7/82** rows all have `keyM=0`, so the signed key-plus-
keyM `bpl` is taken. Frozen `toneType=12` source state makes the following CGB
`beq` not taken without another capture.

From caller resume `0x082dfecc`, the observed route executes **14** Thumb
halfwords, one taken refill, one IWRAM byte read, one IWRAM word read, one
IWRAM byte store, and three EWRAM byte reads: **40 cycles per callback / 280
aggregate**. The contiguous source-exact boundary is now **3,215 aggregate
cycles** across the seven rows, immediately before the first unresolved
`0x082dfeea bne _081DDCBA` on `ToneData.pan_sweep`. Evidence:
`docs/issue55-m4a-note-body-cgb4-v8.md` and
`tests/fixtures/factory-m4a-note-body-cgb4-evidence-v8.json`.

**2026-08-12 CGB4 pan-sweep caller-edge closure:** additive v9 packets preserve
v8 byte-for-byte and capture only `ToneData.pan_sweep` at the exact pipelined
`bne` boundary `0x082dfeec`, gated by the live ChnVolSetAsm return LR. Two
fresh Battle Scene OFF runs per anchor/LILIANA/legal-varied case are
byte-identical (anchor `13d65261…`, LILIANA `86d4d2c5…`, varied
`87a32977…`). The same **7/82** rows all have `pan_sweep=0`: both the `0x80`
and `0x70` `bne` tests are not taken and the caller stores `sweep=8`.

The pinned `0x082dfeea..0x082dff04` route includes the sweep store, EWRAM
`pitM` byte read, two IWRAM stack-argument loads, IWRAM
`SoundInfo.MidiKeyToCgbFreq` function-pointer load, and fixed `BL call_r3`
edge: **13** sequential Thumb halfwords, one taken refill, and one EWRAM
access premium, or **34 cycles per callback / 238 aggregate**. This extends
the contiguous source-exact boundary from **3,215** to **3,453 aggregate
cycles** through `call_r3` entry `0x082dfcb4`. The pointer value, the dynamic
`bx r3`, `MidiKeyToCgbFreq` body, and result are not captured or priced.
Evidence: `docs/issue55-m4a-note-body-cgb4-v9.md` and
`tests/fixtures/factory-m4a-note-body-cgb4-evidence-v9.json`.

**2026-08-12 CGB4 v10 target/helper closure:** additive v10 evidence preserves
the v9 packets and evidence byte-for-byte and joins only by
`sourceStateDigest`; no new oracle capture was required. Pinned source
initialization is sufficient to fail closed without runtime pointer identity:
`m4aSoundInit` calls `SoundInit(&gSoundInfo)` then `MPlayExtender(gCgbChans)`,
`SoundInit` clears the whole struct and installs `DummyFunc`, and
`MPlayExtender`'s satisfied `ID_NUMBER` guard then assigns
`MidiKeyToCgbFreq`. A complete `.c/.h/.s/.inc` reference census pins the two
direct field writes, preceding whole-struct clear, two assembly loads, and all
declarations; runtime pointer/address lookup remains absent.
The `call_r3` `bx r3` edge is **8 cycles** per callback. The complete observed
type-4 helper has two source routes: key **64** subtracts 21 to noise-table
index 43, takes `bls` without clamping, returns `gNoiseTable[43] = 0x34`, and
costs **90** helper / **98** edge-to-return cycles; key **91** subtracts 21 to
70, does not take `bls`, clamps to index 59, returns `gNoiseTable[59] = 0x00`,
and costs **86** helper / **94** edge-to-return cycles. Four rows are key 64
and three are key 91, adding **674** cycles and extending the contiguous
source-exact boundary to **4,127 aggregate cycles** through
`MidiKeyToCgbFreq` return. The reducer pins sequential Thumb/refill classes,
the exact **25 halfword / 4 refill** and **26 / 3** helper PC routes,
zero-premium IWRAM stack accesses, and the 11-cycle ROM literal-word/9-cycle
ROM-table-byte totals under the source-pinned pre-audio WAITCNT value. All ten
post-boot flash writes preserve WS0/prefetch, and debug-printer writers are
absent from the release ELF. The canceled checkpoint's 98/94 helper counts
double-counted `bx r3` inside the helper; its `0x04` result was table index 55,
not the actual clamped index 59.
Evidence: `docs/issue55-m4a-note-body-cgb4-v10.md` and
`tests/fixtures/factory-m4a-note-body-cgb4-evidence-v10.json` (SHA256
`3e3af127…`); frozen v9 evidence SHA256 is `2dd86764…` and packet hashes
remain anchor `13d65261…`, LILIANA `86d4d2c5…`, legal-varied `87a32977…`.

**2026-08-12 CGB4 v11 `ply_note` return closure:** additive v11 reads only the
frozen v10 evidence (SHA256 `3e3af127…`), verifies v10 regenerates byte-for-byte,
and joins the same **7/82** CGB4 rows only by `sourceStateDigest`; no new oracle
capture, runtime identity, or runtime-address lookup is used. From the helper
return PC `0x082dff04`, the fixed `b _081DDCDC` costs **8** cycles, the
frequency/status/track-flags writes cost **14**, and the complete epilogue costs
**22**: `add sp`, `pop {r0-r7}` (eight IWRAM words, multiple transfer), four
high-register restores, final `pop {r0}` (one IWRAM word, single transfer), and
the final `bx r0` return. Static `MPlayOpen`/`MPlayExtender` source census plus
ELF/map prove CGB channels and every registered track allocation IWRAM; `crt0`
proves the IWRAM system stack. Three source/ELF/ROM-guarded compiled regions
therefore add **44 cycles each / 308 aggregate**, extending the contiguous
source-exact boundary from **4,127** through `MidiKeyToCgbFreq` return to
**4,435 aggregate cycles** through `ply_note` return. Evidence:
`docs/issue55-m4a-note-body-cgb4-v11.md` and
`tests/fixtures/factory-m4a-note-body-cgb4-evidence-v11.json`.
The seven rows therefore now carry exact complete-`ply_note` callback costs;
only the other 75 note callbacks stay null.

The v11 reducer fails closed for route, helper/continuation, storage-class,
source/ROM/ELF, frozen-v10, and source-state-join mutations.

**2026-08-12 CGB4 v12 post-`ply_note` dispatcher closure:** additive v12 reads
only frozen v11 (evidence SHA256 `1ad73dc8…`), verifies it regenerates
byte-for-byte, preserves the same seven complete-`ply_note` costs, and joins
only by `sourceStateDigest`. Source/ELF/ROM prove the actual caller ownership:
MPlayMain's dedicated note `BL` at `0x082dfb3e` writes Thumb LR
`0x082dfb43`; `call_r3`'s `bx r3` preserves it; and `ply_note` returns to
aligned caller instruction `0x082dfb42`, `b _081DD938`, rather than the
generic jump-table callback tail.

The return-target branch costs **8** cycles. The IWRAM `wait` read, compare,
and taken zero branch cost **12**; zero is source-proven because the command
loop reached the note only through that same zero test and `ply_note` never
accesses `wait`. The following IWRAM `cmdPtr` word load costs **2**. Thus v12
adds **22 cycles each / 154 aggregate**, extending the contiguous boundary
from **4,435** to **4,589 aggregate cycles** through the command-pointer load.
Five separately hashed ROM regions plus source/ELF symbols guard return
ownership and every instruction/refill/data class. Evidence:
`docs/issue55-m4a-note-body-cgb4-v12.md` and
`tests/fixtures/factory-m4a-note-body-cgb4-evidence-v12.json` (SHA256
`d8e94417…`).

The exact next instruction is `ldrb r1, [r2]`. Frozen v11 retains neither the
current command byte nor the storage class targeted by
`MusicPlayerTrack.cmdPtr`, and neither is statically source-general, so v12
stops before the dereference. The still-open remainder is that command-byte/
storage discriminator and later track-loop work for these seven callbacks,
the other **75** note callbacks and their glue, unobserved helper/key/nonzero-
`lfoDelay` routes, the complete-MPlay aggregate (**5 exact / 108 null**),
service/arbitration, and construction-clock wiring. No new unsupported barrier
or canonical Battle-2 extension was added.

**2026-08-12 CGB4 v13 next-command wait-route closure:** additive v13 preserves
frozen v12 byte-for-byte and joins only by `sourceStateDigest`. Twice-fresh,
address-free Battle Scene OFF packets capture exactly the current command byte
and `MusicPlayerTrack.cmdPtr` target storage class for the same **7/82** rows:
all target `gamepak-ws0`; bytes are `0x86 ×2 / 0x8c ×3 / 0x92 ×2`. Packet
SHA256 are anchor `c3c7b33f…`, LILIANA `10adc46c…`, and legal-varied
`14524c0f…`, with byte-identical repeats.

All seven take the encoded-wait route. Exact source/ELF/ROM guards cover the
compiled command path, complete `gClockTable`, and each inherited normalized
song byte. From v12's `ldrb r1,[r2]` through wait assignment and the first
decrement, the route executes 21 sequential Thumb halfwords, four taken
refills, two GamePak bytes, and one GamePak literal word: **89 cycles each /
623 aggregate**. The contiguous boundary advances from **4,589** to **5,212
aggregate cycles**. Evidence: `docs/issue55-m4a-note-body-cgb4-v13.md` and
`tests/fixtures/factory-m4a-note-body-cgb4-evidence-v13.json` (SHA256
`1bb3b2b6…`).

Closure stops before the next IWRAM `lfoSpeed` read because its scalar is not
captured. Later track-loop work, the other 75 callbacks, complete MPlay totals
(**5 exact / 108 null**), service/arbitration, and construction-clock wiring
remain null. No runtime pointer/address identity, unsupported barrier,
animation/Rust change, or canonical Battle-2 extension landed.

**2026-08-12 CGB4 v14 `lfoSpeed` decision closure:** additive v14 preserves
frozen v13 byte-for-byte and joins only the same **7/82** CGB4 rows by
`sourceStateDigest`. Twice-fresh address-free Battle Scene OFF packets capture
only `MusicPlayerTrack.lfoSpeed`: all seven are `44` (0 anchor / 3 LILIANA / 4
legal-varied). Packet SHA256 are anchor `04188570…`, LILIANA `a641b339…`, and
legal-varied `e2b8cf01…`, with byte-identical repeats.

The first LFO decision contiguous with v13's wait decrement takes the same
nonzero/no-refill edge in every row. Source/ELF/ROM guards cover only the exact
six bytes `0x082dfb7a..0x082dfb80`: IWRAM `lfoSpeed` read, compare, and
not-taken branch. That adds **6 cycles each / 42 aggregate**, advancing the
contiguous prefix from **5,212** to **5,254 aggregate cycles**. Evidence:
`docs/issue55-m4a-note-body-cgb4-v14.md` and
`tests/fixtures/factory-m4a-note-body-cgb4-evidence-v14.json` (SHA256
`82138617…`).

Closure stops before the immediately following IWRAM `MusicPlayerTrack.mod`
read: `mod`, delay/oscillator state, later re-visits of the positive wait, and
every later branch/memory access remain uncaptured and null. The other 75
callbacks, complete MPlay totals (**5 exact / 108 null**), service/arbitration,
construction-clock wiring, runtime pointer/address identity, animation/Rust,
and canonical Battle-2 work remain untouched.

**2026-08-12 CGB4 v15 `mod` decision closure:** additive v15 preserves frozen
v14 byte-for-byte and joins only the same **7/82** CGB4 rows by
`sourceStateDigest`. Two fresh address-free Battle Scene OFF packet sets are
byte-identical: anchor `0700a3f3…`, LILIANA `4375e86d…`, and legal-varied
`6c903177…`; the distribution remains **0 anchor / 3 LILIANA / 4
legal-varied**. The only new scalar is `MusicPlayerTrack.mod`, and all seven
values are zero.

Source/ELF/ROM guards close only the six bytes `0x082dfb80..0x082dfb86`:
IWRAM `mod` read, compare, and the taken `beq _081DD994` to the existing exit.
The route is **3 sequential Thumb halfwords + 1 taken refill = 12 cycles per
row / 84 aggregate**, advancing the source-exact contiguous prefix from
**5,254** to **5,338 cycles**. Evidence is
`docs/issue55-m4a-note-body-cgb4-v15.md` and
`tests/fixtures/factory-m4a-note-body-cgb4-evidence-v15.json` (SHA256
`28ec38e9…`); the packet repeat hashes are equal by construction and the
Tier-1 report guard verifies the v14 prefix byte-for-byte.

Closure stops before the immediately subsequent IWRAM
`MusicPlayerTrack.lfoDelayC` read; no delay/oscillator state, later revisit,
pointer/address identity, frame/duration, service/arbitration,
construction-clock wiring, unsupported barrier, animation/Rust work, or
canonical Battle-2 extension landed. The other 75 callbacks and complete MPlay
totals (**5 exact / 108 null**) remain null.

**2026-08-12 CGB4 v16 track-loop exit register-move closure:** source-only
v16 preserves frozen v15 byte-for-byte and joins only its same seven
`sourceStateDigest` rows (**0 anchor / 3 LILIANA / 4 legal-varied**). It
captures no oracle data and neither reads nor infers `r6` or a track count.

Source/ELF/ROM guards close exactly the four bytes
`0x082dfbcc..0x082dfbd0`: `mov r3, sl` then `mov r4, fp` at `_081DD994`.
The pair is **2 sequential Thumb halfwords = 4 cycles per row / 28
aggregate**, advancing the contiguous prefix from **5,338** to **5,366
cycles**. Evidence is `docs/issue55-m4a-note-body-cgb4-v16.md` and
`tests/fixtures/factory-m4a-note-body-cgb4-evidence-v16.json` (SHA256
`f9d539ac…`); the Tier-1 report guard regenerates frozen v15 byte-for-byte.

Closure stops before `subs r6, 0x1`. The decrement, loop continuation/exit,
later track-loop work, other 75 callbacks, complete MPlay totals (**5 exact /
108 null**), service/arbitration, and construction-clock wiring remain null.
No production, unsupported-barrier, animation/Rust, or canonical Battle-2
change landed.

**2026-08-12 CGB4 v17 track-loop decrement/decision closure:** additive v17
preserves frozen v16 evidence and report byte-for-byte and joins only the same
**7/82** CGB4 rows by `sourceStateDigest`. Two fresh address-free Battle Scene
OFF packet sets are byte-identical: anchor `5dca04f7…`, LILIANA
`68fb3aa3…`, and legal-varied `e5e3ce1a…`. At the exact pipelined
`subs r6, 0x1` boundary, four rows capture `r6=3` and three capture `r6=2`;
the source decrement leaves positive `2`/`1`, so all seven observed
`ble _081DD9A4` routes are not taken. This is direct register evidence, not a
track-count relation inferred from `trackIndex`.

Source/ELF/ROM guards close only bytes `0x082dfbd0..0x082dfbd4`:
`subs r6, 0x1; ble _081DD9A4`. Each observed ARM7TDMI route is two sequential
Thumb halfwords with no refill: **4 cycles per row / 28 aggregate**, advancing
the contiguous prefix from **5,366** to **5,394 cycles**. The generic reducer
also prices a captured taken route at 10 cycles, but no exit row is observed.
Evidence is `docs/issue55-m4a-note-body-cgb4-v17.md` and
`tests/fixtures/factory-m4a-note-body-cgb4-evidence-v17.json` (SHA256
`e4ff5796…`); its Tier-1 guard verifies frozen v16 evidence/doc hashes and
regeneration.

Closure stops before `movs r0, MusicPlayerTrack_size` on the observed
continuation and before `ldr r0, [r7, o_MusicPlayerInfo_clock]` on the
unobserved exit. Later loop-body work, other 75 callbacks, complete MPlay
totals (**5 exact / 108 null**), service/arbitration, construction-clock
wiring, production, presentation, animation/Rust, and canonical Battle-2 work
remain null; no unsupported-barrier or canonical-recording ratchet changed.

**2026-08-12 CGB4 v18 observed continuation-body closure:** source-only v18
preserves frozen v17 evidence/report and its three address-free packets
byte-for-byte (evidence `e4ff5796…`, doc `884ad63d…`, packets
`5dca04f7…` / `68fb3aa3…` / `e5e3ce1a…`), verifies v17 regenerates, and joins
only its same **7/82** `sourceStateDigest` rows. No oracle data, flags,
next-track identity, or track count is read or inferred.

Source/ELF/exact-ROM guards close only `0x082dfbd4..0x082dfbdc` bytes
`50 20 2d 18 5b 00 6b e7`: `movs r0, MusicPlayerTrack_size; adds r5, r0;
lsls r3, 1; b _081DD87C`. The established ARM7TDMI classes give four
sequential Thumb halfwords plus one taken branch refill: **14 cycles each /
98 aggregate**, advancing the seven-row contiguous prefix from **5,394** to
**5,492 cycles**. Evidence is `docs/issue55-m4a-note-body-cgb4-v18.md` and
`tests/fixtures/factory-m4a-note-body-cgb4-evidence-v18.json` (SHA256
`812f3f49…`).

The closure stops before `_081DD87C`'s first `ldrb r0, [r5, o_MusicPlayerTrack_flags]`; next-track flags, track identity,
`trackCount`, and later loop body remain null. The v17 exit successor remains
**null**, as do the other **75** callbacks, complete MPlay totals (**5 exact /
108 null**), service/arbitration, and construction-clock wiring. No production,
presentation, animation/Rust, canonical Battle-2, unsupported-branch, or
canonical-recording import change landed.

**2026-08-12 CGB4 v19 next-track EXIST decision closure:** additive v19
preserves frozen v18 evidence/report and all v17 packets byte-for-byte, and
joins only the frozen **7/82** rows by `sourceStateDigest`. Two fresh Battle
Scene OFF packet sets are byte-identical: anchor `18620078…`, LILIANA
`1d31dfc0…`, and legal-varied `7c9978e5…`. Packets are address-free and
contain only the next-track `flags` byte and direct `r0`/`r1`/TST branch
evidence. Four rows have `flags=0x80` and take `_081DD886`; three have
`flags=0` and fall through to `b _081DD998`.

Source/header/ELF/ROM guards close only bytes `0x082dfab4..0x082dfabe`:
`ldrb flags; movs MPT_FLG_EXIST; tst; bne _081DD886`, plus the unconditional
branch only on clear rows. Counting each executed branch halfword consistently
with v18 gives **14 cycles** for each EXIST-set route and **16** for each clear
route: **104 aggregate**, advancing the prefix from **5,492** to **5,596
cycles**. Evidence is `docs/issue55-m4a-note-body-cgb4-v19.md` and
`tests/fixtures/factory-m4a-note-body-cgb4-evidence-v19.json`.

Closure stops before the selected `_081DD886` or `_081DD998` successor.
Next-track identity/index/count, `r5`, channel pointer/status/gate time, start
flag, command pointer, later loop body, the v17 exit successor, other 75
callbacks, complete MPlay totals (**5 exact / 108 null**), service/arbitration,
and construction-clock wiring remain null. No production, presentation,
animation/Rust, canonical Battle-2, unsupported-branch, or recording-import
ratchet change landed.

**2026-08-12 CGB4 v20 EXIST-clear second-decrement closure:** additive v20 is
strictly source-only: it preserves frozen v19 evidence/report and all three
v19 packets byte-for-byte, verifies v19 regenerates, joins only
`sourceStateDigest`, and captures no new oracle data. It closes only the three
frozen `flags=0` rows whose v19-selected successor is `_081DD998`; the four
EXIST-set rows retain **null v20 cost** and remain stopped before `_081DD886`.

For every clear row, frozen v17 fields prove `r6BeforeDecrement=2` and
`postDecrementR6=1`. Source/ELF/exact-ROM guards prove that every exact v18
continuation and v19 clear-decision instruction leaves `r6` untouched, so
`r6=1` reaches `_081DD998` without an identity/index/count inference. Exact
ROM bytes `01 3e 03 dd` then close only `subs r6, 0x1; ble _081DD9A4`: the
second decrement yields zero and the branch is taken. Both executed Thumb
halfwords—including the branch—cost 2 cycles plus the established 6-cycle
taken refill: **10 cycles each / 30 aggregate**, advancing the seven-row
prefix from **5,596** to **5,626 cycles**. The v17 (2 halfwords/no refill),
v18 (4/one), and v19-clear (5/one) timing is explicitly cross-checked.
Evidence is `docs/issue55-m4a-note-body-cgb4-v20.md` and
`tests/fixtures/factory-m4a-note-body-cgb4-evidence-v20.json` (SHA256
`ba5fa1b0…`). All clear rows stop before `_081DD9A4`'s first `ldr`; its exit
body, the clock, track identity/index/count, later loop work, the unobserved
v17 exit successor, other 75 callbacks, complete MPlay totals (**5 exact /
108 null**), service/arbitration, and construction-clock wiring remain null.
No production, presentation, animation/Rust, canonical Battle-2,
unsupported-branch, or recording-import ratchet change landed.

**2026-08-12 CGB4 v21 clock-exit decision closure:** additive v21 freezes
v20 evidence/report byte-for-byte and joins only its three frozen EXIST-clear
`sourceStateDigest` rows. Two fresh address-free Battle Scene OFF packet sets
are byte-identical (anchor `f13515a2…`, LILIANA `11d4dab5…`, legal-varied
`7adb7dfd…`). Each packet retains exactly the join digest plus one boolean:
`r4Nonzero`; every observed row is true. It retains no pointer, runtime
address, frame, duration, clock scalar, track identity/count, or later state.

Source/ELF/exact-ROM close only `_081DD9A4` through its `bne`: clock `ldr`,
`adds`, clock `str`, `cmp r4, 0`, and branch. `MusicPlayerInfo` is source/ELF
IWRAM storage, so the two word accesses add zero premium. The three observed
nonzero branches each take the established six-cycle refill: **5×2 + 6 = 16
cycles each / 48 aggregate**, advancing the prefix from **5,626** to
**5,674 cycles**. The branch stops before any successor instruction; selected
successor, status write, tempo/body, other 75 callbacks, complete MPlay,
service/arbitration, and construction-clock wiring remain null. All four
EXIST-set rows retain null v21 fields before `_081DD886`. Generated evidence:
`docs/issue55-m4a-note-body-cgb4-v21.md` and
`tests/fixtures/factory-m4a-note-body-cgb4-evidence-v21.json` (SHA256
`a5581d78…`); both frozen v20 artifacts and v21 packets are explicitly
verified absent from production imports. No `src/**`, unsupported barrier,
animation/Rust, or canonical Battle-2 change landed.

**2026-08-12 CGB4 v22 r4-taken successor-prefix closure:** strictly
source-only v22 freezes v21 evidence/report byte-for-byte and hash-pins the
exact three-file v21 packet directory; the predecessor evidence/report is
also regenerated byte-for-byte with no probe or oracle invocation. It joins
only the three frozen `sourceStateDigest` rows whose v21 `r4Nonzero` branch is
already taken. The four EXIST-set rows remain null before `_081DD886`.

Source/ELF/exact-ROM close only `_081DD9B6.._081DD9BC`: `str r4` to
`MusicPlayerInfo.status`, `ldrh r0` from `MusicPlayerInfo.tempoC`, and
`subs r0, 150`. Exact bytes are `7c 60 78 8c 96 38`; all three executed Thumb
halfwords cost **6 cycles** per selected row, with one IWRAM word store and
one IWRAM halfword load at zero premium: **18 aggregate**, advancing the
prefix **5,674 → 5,692**. The source/ELF guard now pins status/tempoC offsets
(4/34), the `gPokemonCryMusicPlayers` two-entry/128-byte IWRAM symbol, and
the static four-normal-plus-two-cry player provenance without selecting a
runtime array element. It stops before `_081DD9BC`'s first `strh`; the
tempoC scalar, subtraction result, bcc decision, later body, other 75
callbacks, complete MPlay (**5 exact / 108 null**), service/arbitration, and
construction-clock wiring remain null. Evidence:
`docs/issue55-m4a-note-body-cgb4-v22.md` and
`tests/fixtures/factory-m4a-note-body-cgb4-evidence-v22.json` (SHA256
`fb345eca…`). No `src/**`, unsupported barrier, animation/Rust, canonical
Battle-2, recording import, oracle, or probe change landed.

**2026-08-12 CGB4 v23 post-`subs` store/compare/branch closure:** additive
v23 freezes v22 evidence/report byte-for-byte and preserves every v21 packet
byte/hash exactly. Two fresh, address-free Battle Scene OFF packet sets are
byte-identical (anchor `fc84cabe…`, LILIANA `f506f1e9…`, legal-varied
`9019c3fa…`) and join **only** the three frozen v22 `sourceStateDigest` rows
whose selected successor is `_081DD9B6`. Each selected packet retains exactly
that digest plus one scalar, the post-`subs` `r0` `subtractionResult`, which
is **72** in all three rows; neither the original `tempoC` scalar, pointer or
runtime address, frame/duration, clock, track identity/index/count, condition
flags, nor later body state is read, retained, or reconstructed. All four
EXIST-set rows remain null before `_081DD886`.

Source/ELF/exact-ROM close only `0x082dfbf4`'s eight bytes `78 84 96 28 00 d3
57 e7`: `strh r0,[r7,#0x22]; cmp r0,#150; bcc _081DD9C4; b _081DD874`.
The static player-storage class proves the `strh` is IWRAM at zero premium
without selecting a runtime player. Every executed Thumb halfword costs 2
cycles and exactly one taken-control refill costs 6: the observed
`72 < 150` bcc-taken route is **3×2 + 6 = 12** cycles per row (**36**
aggregate), advancing the contiguous prefix **5,692 → 5,728** cycles and
stopping before `_081DD9C4`'s first `ldrb`. The fail-closed reducer also
prices the unobserved bcc-not-taken plus immediately executed unconditional
`b _081DD874` route at **4×2 + 6 = 14** cycles, stopping before that target's
first instruction; it does not claim either successor body. Complete MPlay
remains **5 exact / 108 null**; other callbacks, service/arbitration, and
construction-clock wiring remain null. Evidence is
`docs/issue55-m4a-note-body-cgb4-v23.md` and
`tests/fixtures/factory-m4a-note-body-cgb4-evidence-v23.json` (SHA256
`4ae623c8…`). No production, presentation, animation/Rust, canonical
Battle-2, ratchet, or unsupported-barrier change landed.

**2026-08-12 CGB4 v24 source-only successor-prefix closure:** v24 freezes
v23 evidence/report byte-for-byte and joins only the same three frozen
selected sourceStateDigest rows, with no oracle capture or runtime scalar.
It closes exactly source lines 1360-1362 / ELF 0x082dfbfc..0x082dfc00:
the track-count byte load and tracks-field word load. Source layout pins
their offsets (8/44), static player storage is IWRAM without selecting a
runtime player, and exact ROM bytes are 3a 7a fd 6a.

The two sequential Thumb halfwords cost 2 cycles each; both IWRAM loads add
zero premium and no control-transfer refill executes. Thus the fixed prefix
is **4 cycles per selected row / 12 aggregate**, advancing **5,728 → 5,740**
and stopping before _081DD9C8's first track-flags load. No actual track
count, tracks pointer/identity/address, track flags/index/identity, loop
body, complete MPlay, service/arbitration, or construction-clock behavior is
captured or claimed. Evidence:
`docs/issue55-m4a-note-body-cgb4-v24.md` and
`tests/fixtures/factory-m4a-note-body-cgb4-evidence-v24.json`; the red-first
Tier-1 proof rejects the 2-cycle under-price and runtime-field widening fails
closed. No production, presentation, animation/Rust, canonical Battle-2,
ratchet, or unsupported-barrier change landed.

**2026-08-12 CGB4 v25 first-track `MPT_FLG_EXIST` decision closure:** two
fresh serial address-free Battle Scene OFF packet sets are byte-identical
(anchor `3ac4e4a8…`, LILIANA `ce742039…`, legal-varied `bd289cb9…`). v25
freezes v24 evidence/report byte-for-byte and joins only its same three
`sourceStateDigest` rows. At the exact post-`ldrb` / pre-`movs` boundary for
`_081DD9C8`, each packet retains exactly the digest plus
`firstTrackFlags`; all three observations are **0x80**. The association is
carried in memory from v23's proven digest handoff, so no pointer/runtime
address, track count/index/identity, channel, frame, duration, condition
flags, or wider state is serialized.

Source/ELF/exact-ROM close only `ldrb r0,[r5,flags]; movs r1,0x80; tst
r1,r0; beq _081DDA62` (`28 78 80 21 01 42 48 d0`). All candidate static
MPlay/cry track storage is IWRAM without selecting a runtime track. The
observed EXIST-set/non-taken route is **4×2 = 8 cycles per row / 24
aggregate**, advancing **5,740 → 5,764** and stopping before `_081DD9D0`'s
volume/pitch mask. The flags-absent taken-`beq` route is source-priced
fail-closed at **14** cycles (8 + one 6-cycle refill), but is not claimed
observed and does not enter `_081DDA62`. The four prior EXIST-set rows, other
75 callbacks, complete MPlay (**5 exact / 108 null**), service/arbitration,
and construction-clock wiring remain null. Evidence:
`docs/issue55-m4a-note-body-cgb4-v25.md` and
`tests/fixtures/factory-m4a-note-body-cgb4-evidence-v25.json` (SHA256
`26a2f0c9…`); red-first tests reject the missing-refill/wrong-route
under-price and packet widening. No `src/**`, presentation, animation/Rust,
canonical Battle-2, ratchet, or unsupported-barrier change landed.

## #39 — `battleScene.ts` is a state machine over one canonical battle

**Symptom:** most production battle presentation is still keyed to *which turn
of the recorded Battle 1/2 we are in*, not to what happened. Individual exact
windows now consume kernel semantic events, but the surrounding dispatcher and
most content remain turn-keyed.

**Canonical-split program STOPPED at its natural boundary (2026-08-08,
supervisor).** Five slice batches moved ~240 canonical-only symbols out of
`battleScene.ts` into `battleSceneCanonical.ts`, every one verified as a pure move
by `npm run compare:differential` at **1369/1369 byte-identical**. Batch 5 then
found **no eligible tranche left**: all **199** remaining canonical symbols depend
on a battleScene-local SHARED/LIVE symbol (`TURN5_SWITCHIN`, `PIDGEOTTO_MAX_HP`,
`TURN8_MENU_REDRAW_DELAY`, `drawSpriteSheet`, `battleWindow`,
`drawMessageTextLines`, `TICK0`, `TURN13_RESOLUTION`, …), so moving them would pull
a runtime value import from `battleScene.ts` back into the canonical file. Slice 1
already proved empirically that such an import forms an ESM cycle whose module-eval
read throws TDZ.

**Decision (a) AUTHORIZED (2026-08-19, supervisor decision):** canonical→
`battleScene.ts` value imports via re-export are allowed, exactly as
`docs/battlescene-canonical-split-design.md` §7 hazard 1 recommends, under
its own safety rule enforced per symbol: the moved symbol may read the
imported binding **only inside function bodies** (never at module eval —
slice 1 proved eval-time reads TDZ-crash), each batch is proven by the
standing differential recipe plus full `npm test`/`npm run build`, and any
symbol that would need an eval-time read stays put. Decision (b) (widening
`tests/animation/animationBoundaryRatchet.test.ts`) remains NOT taken —
cross-program, still deferred; the 8-symbol ONIX-Sitrus cluster and the two
`let` caches stay in `battleScene.ts`. Rationale: reversible pure-structure
change, the design doc's own recommended option, and the only path left for
this filler-priority program (2026-08-19 batch confirmed the wall live).

The original framing of that choice, kept for context:

Going further needs one of two **deliberate structural decisions**, neither of which
a slice worker may take: (a) allow canonical→`battleScene.ts` value imports via
re-export (`docs/battlescene-canonical-split-design.md` §7 hazard 1's recommended
option) and evaluate the TDZ risk per symbol — eval-time reads are unsafe, function-
body reads are not; or (b) widen `tests/animation/animationBoundaryRatchet.test.ts`'s
`allowedConsumers`, which is a cross-program decision. Four named obstacles also
remain: the `MenuIdleFrameAsset`/`SendOutHealthboxContentAsset` type-only export
widening, `drawTurn16PostSwitchField`'s `src/animation` import, the ONIX-Sitrus
cluster plus its module-eval guard, and the two `let` caches.

**2026-08-19 update (main worker session 10, `f15cb254`):** the graph had
genuinely opened up somewhat — batch 5 found 12 more movable symbols
(CANONICAL 226 → 214, up from batch 5's 2026-08-08 zero, differential
1241/1241 byte-identical) — but confirmed the ONIX-Sitrus cluster
specifically is still blocked, for a reason not previously spelled out:
`onixSitrusRotateMatrix`/`turn5GrantingStarPlacement`/`turn5SitrusHealText
VisibleChars`/`turn5SitrusOnixHp`/`onixSitrusTintCoeff`/`turn5SitrusRing
Matrix` (plus their two support constants) call `sitrus*AtAge` helpers from
`../animation/heldItemHeal.ts` — moving them trips
`animationBoundaryRatchet.test.ts`'s engine/animation import boundary
(`docs/battlescene-canonical-split-design.md` §7 hazard 1), confirmed live
via a failed `tsc -b` run. The two `let` caches remain blocked as described
above. Neither obstacle is new in kind, just newly confirmed against the
current tree.

**2026-08-19 update (main worker session 12, `75b73fab`):** batch 8, 47
more symbols (CANONICAL 123 → 76). Found a real gap in the eligibility
scanner's let-cache hazard class: it only flagged moving the `let` itself,
not a function elsewhere that assigns into a still-resident let-cache
(`turn10OnixDarkPalette`, `getMenuHealthboxPlayerContentMask` — both
scanner-ELIGIBLE, both excluded by hand after reading their bodies). Full
detail: `PROGRESS.md` #1352,
`docs/presentation-seam-retirement-ladder.md` Slice 2. **Gap CLOSED
2026-08-19 (side worker, `e99c3511`):** new H3-let-write hazard class —
a function-kind candidate assigning (`=`, compound ops, `++`/`--`) to a
stay-behind module-level `let` is now auto-blocked; method calls/reads on
the binding don't trigger it, so `playerHealthboxHpOverlayForHp` (Map
`.get()`/`.set()`) stays correctly ELIGIBLE and is the whole remaining
function-kind pool (1 symbol).

**2026-08-19 update (main worker session 11, `74f3c1c2`):** first batch
under decision (a) — 41 `function`-kind canonical symbols moved (CANONICAL
214 → 173, differential 1241/1241 byte-identical, full `npm test`
10,114/10,114). Found a **second instance of hazard 1** beyond the
ONIX-Sitrus cluster: 6 more functions (`drawFirePunchBurnFlames`,
`drawFirePunchEmbers`, `drawGrovyleSettled`, `drawTurn13MurkrowSettled`,
`drawTurn5PidgeottoSettled`, `drawTurn6FeatherSprites`) reference
identifiers battleScene.ts imports from `src/animation/*`
(speciesIdleAnim.ts, firePunch.ts, featherDance.ts) — same blocked
class, same root cause (decision (b) not taken), confirmed live via
`npm run typecheck` before exclusion. Also confirmed `ONIX_SITRUS_ROTATE_
RENDER_LAG` (a support constant for the ONIX-Sitrus cluster) is read
eagerly by the file's one remaining top-level module-eval `if` guard, so
it stays with the cluster it feeds. See `docs/presentation-seam-
retirement-ladder.md` Slice 2 and `PROGRESS.md` #1350 for the full
eligibility-scan method and remaining-work breakdown (~111 non-`function`
canonical symbols and topological-dependency `function`s untried this
round).

**Also worth knowing:** the selection scan's `FORBIDDEN` set was **dead code** until
2026-08-08 (`70caf397`) — pass 1 marked forbidden roots clean, so pass 2 treated
them as satisfied deps and falsely certified every ONIX-cluster consumer as
SELF-CONTAINED. Fixed. Two earlier batches had already caught false positives by
hand, which is why no bad move landed. **A `CLEAN` label from that scan is not proof
of movability** — check each candidate's actual declaration form.

**Honest scope, restated:** this was a move within one module graph. The canonical
code still ships, and the canonical bucket is only ~5.3k lines, so the split is a
modest reduction — not the retirement of turn-keyed presentation that this issue is
actually about. That retirement remains the presentation-seam program's job.

**Confirmed** (2026-07-24, `856b3b4`): 17,056 lines — **30% of all
`src/engine`**. 74 `BattleSceneState` declaration lines name a specific turn
(`turn13KoDismissElapsed`, `turn13Resolved`, `turn15PartySelect`,
`turn17MenuRedrawElapsed`, `turn17KoDismissElapsed`,
`turn17OutcomeDismissElapsed`, `turn17LossDismissElapsed`); 969 lines reference
a turn number; per-species render entry points are hardcoded
(`onixSitrusRotateMatrix`, `turn5GrantingStarPlacement`). Sibling files
`battle2Turn1.ts`, `battle2ActionMenu.ts`, `battle2OffScenario.ts`,
`turn17.ts` share the shape.

**Retirement progress:** the inventory's **rank-1 window is retired**
(2026-07-31, `289fe2c7`): the Battle-2 command turn now sources
request/field/HP facts from the real kernel via `battle2CommandAdapter.ts`
with RAM-probed personalities and bench; `battle2Turn1.ts`,
`battle2ActionMenu.ts`, and `battle2OffScenario.ts` are deleted, all dense
pins held (191/191, 209/209, 16/16, plus generated-route 128/128 and
715/715). Rank 2 is **fully retired** (2026-07-31): the
DRAGON_BREATH/faint half (`bd1d6beb`) and the Murkrow switch-in half
(round 11 — `stagePlayerHitChainToTerminalMachineState` exposure, the
real `openpartyscreen`/`switchindataupdate` opcodes materializing MURKROW
from DESTIN's probed bench via the 0-draw proven replacement decision,
and the MURKROW level/healthbox/sent-out literals now adapter-derived)
onto `turn13ResolutionAdapter.ts`. Pins held: 141/141 + 242/242 +
dense-b 223/223 (dense-a 205/256 is the A/B-proved pre-existing parked
#23 exclusion). Rank 3 is **fully retired** (2026-07-31): KO/switch-in half
`5db34996` (preview promoted to `turn5ResolutionAdapter.ts`, faint-sink
geometry from the generic formula at Grovyle's yOffset, PIDGEOTTO
level/healthbox/sent-out adapter-derived), Sitrus heal half `54278249`
(heal HP endpoints + STRINGID_PKMNSITEMRESTOREDHEALTH lines
adapter-derived, timing curves kept, `TURN5_PRESENTATION_TIMING_NOT_
STAGED` deleted), and the adapter swapped onto the #57-fixed shared
staging helper (`14c4295b`, ~120-line local workaround deleted). All
nine turn5 pins + five insurance pins held at every step. The dead
`turn5KoDismissElapsed` mirror is retired (`88fd05f6`): its sole reader was
its own one-shot guard, while render/continuation already consumed the staged
lifecycle. The typed completed-turn-5/next-command handoff retired
`turn5Resolved` (`73cb7455` + `891a44d7` + `97de11a4`): it owns canonical PP
**[6,20,19,10]**, persisted slot 0, and settled/ready facts for turn-6
dispatch, PP reconstruction, and the turn-7 reopen guard. The existing adapter
continues to own switch/Sitrus content.
The matching typed completed-turn-6/next-command handoff retired
`turn6Resolved` (`80b2767a` + `c6f3cdd4`): it publishes canonical PP
**[5,20,19,10]**, persisted slot 0, and settled/ready facts directly rather
than treating either FEATHER_DANCE/ROCK_SLIDE stage as combined completion.
It now owns turn-7 dispatch, PP reconstruction, and the turn-8 reopen guard.
Clean-`80b2767a` app replays held all required primary, boundary, reader, and
upstream windows byte-identical (**1,461/1,461 raw RGBA captures**).
The matching typed completed-turn-7/next-command handoff retired
`turn7Resolved` (`74f4a0d5` + `8a73efc3`): it publishes canonical PP
**[4,20,19,10]**, persisted slot 0, and settled/ready facts directly rather
than composing either FEATHER_DANCE/ROCK_SLIDE stage. It now owns turn-8
dispatch, PP reconstruction, and the turn-9 reopen guard. Clean-`74f4a0d5`
app replays held every required primary, boundary, reader, and upstream window
byte-identical (**1,413/1,413 raw RGBA captures**).
The matching typed completed-turn-8/next-command handoff retired
`turn8Resolved` (`8f83bb4e` + `56d48b80`): it publishes canonical PP
**[4,19,19,10]**, persisted slot 1, and settled/ready facts directly rather
than composing either FEATHER_DANCE/BIND stage. It now owns turn-9 dispatch,
PP reconstruction, and the following reopen guard. Clean-`8f83bb4e` app
replays held every required primary, boundary, reader, and upstream window
byte-identical (**1,385/1,385 raw RGBA captures**).
The matching typed completed-turn-9/next-command handoff retired
`turn9Resolved` (`8e0fbc80` + `6f9ef899`): it publishes canonical PP
**[3,19,19,10]**, persisted slot 0, and settled/ready facts directly rather
than gating on a turn-9 move staging module. It now owns turn-10 dispatch,
slot-0 PP reconstruction, and the following reopen guard. Clean-parent
`00f79944` (`8e0fbc80^`) app replays held every required primary, reader, and
upstream window byte-identical (**1,483/1,483 raw RGBA captures**).
The matching typed completed-turn-10/next-command handoff retired
`turn10Resolved` (`f8e6bcc7` + `f702a404`): it publishes canonical PP
**[2,19,19,10]**, persisted slot 0, and settled/ready facts directly rather
than gating on a turn-10 move staging module. It now owns turn-11 dispatch,
slot-0 PP reconstruction, and the following reopen guard. Clean-parent
`1056b153` (`f8e6bcc7^`) app replays held every required primary, reader, and
upstream window byte-identical (**1,842/1,842 raw RGBA captures**).
The matching typed completed-turn-11/next-command handoff retired
`turn11Resolved` (`c96ce5b3` + `0499bc30`): it publishes canonical PP
**[1,19,19,10]**, persisted slot 0, and settled/ready facts directly rather
than gating on `turn11FeatherDancePresentationStaging.ts`, which continues to
own only opponent move content. It now owns turn-12 dispatch, slot-0 PP
reconstruction, and the following reopen guard. Clean-parent `5b46d038`
(`c96ce5b3^`) app replays held every required primary, reader, and upstream
window byte-identical (**1,033/1,033 raw RGBA captures**).
The matching typed completed-turn-12/next-command handoff retired
`turn12Resolved` (`ad34442f` + `271d7c03`): it publishes canonical PP
**[0,19,19,10]**, persisted slot 0, and settled/ready facts directly; the
turn-12 ROCK_SLIDE miss still consumes its tenth PP, and this owner deliberately
does not reuse the later post-DRAGON_BREATH turn-13 handoff. It now owns
turn-13 dispatch, slot-0 PP reconstruction, and the following reopen guard.
Clean-parent `fbd575a9` (`ad34442f^`) app replays held all requested turn-12,
OFF turn-13 reopen/reader, and legacy turn-13 insurance windows byte-identical
(**1,141/1,141 raw RGBA captures**). Turns 9–12 are now all retired; #39
remains open for turns 1–4 and dispatcher debt.
The matching typed completed-turn-1/next-command handoff retired
`turn1Resolved` (`b34e6279` + `13389b9c`): it publishes canonical PP
**[9,20,20,10]**, persisted slot 0, HP **117/101**, settled/ready facts, and
the runtime-relative `HandleInputChooseAction` → `DoBounceEffect` epoch
(elapsed **1308**). It now owns turn-2 dispatch, opponent-HP selection,
slot-0 PP reconstruction, and the following submenu/kickoff bounce clock;
the 2901 reopen activates a new command lifecycle without replacing the
epoch. Clean-parent `76af5060` (`b34e6279^`) app replays held all four
turn-1 primary OFF windows and the two turn-2 reader windows byte-identical
(**1,162/1,162 raw RGBA captures**). Turns 1 and 5–13 are now retired.
The matching typed completed-turn-2/next-command handoff retired
`turn2Resolved` (`c16386d6` + `7a3fca06`): it publishes canonical PP
**[9,20,19,10]**, persisted slot 2, HP **101/88**, settled/ready facts, and
the runtime-relative `HandleInputChooseAction` → `DoBounceEffect` epoch
(elapsed **2197**, source seeds **192/128**, delta **7**, amplitude **1**).
It now owns turn-3 dispatch, opponent/player-HP selection, slot-2 PP
reconstruction, ENDEAVOR-family routing, and the following submenu/kickoff
bounce clock; later turn-3 menu reopens consume the same immutable epoch.
Clean-parent `ace2b44c` (`c16386d6^`) app replays held turn-2 primary,
turn-3 reader, and upstream insurance windows byte-identical
(**990/990 raw RGBA captures**).
The matching typed completed-turn-3/next-command handoff retired
`turn3Resolved` (`3487117c` + `0e7fd346`): it publishes canonical PP
**[8,20,19,10]**, persisted slot 0, HP **88/41**, settled/ready facts, and
the runtime-relative `HandleInputChooseAction` → `DoBounceEffect` epoch
(elapsed **3172**, source seeds **192/128**, delta **7**, amplitude **1**).
It now owns turn-4 dispatch, shared HP/content, slot-0 PP reconstruction,
the DOUBLE_TEAM/ROCK_SLIDE routing, and the turn-4 submenu/kickoff bounce
clock; the turn-4 B-close/A-reopen consumes the same immutable epoch.
Clean-parent `354ebc89` (`3487117c^`) app replays held the turn-3 primary,
turn-4 reader, and upstream turn-2 window byte-identical
(**1,165/1,165 raw RGBA captures**). The matching typed completed-turn-4/
next-command handoff retired `turn4Resolved` (`75d9c1d3` + `350d5aa0`): it
publishes canonical PP **[7,20,19,10]**, persisted slot 0, HP **88/1**,
settled/ready facts, and the runtime-relative `HandleInputChooseAction` →
`DoBounceEffect` epoch (elapsed **4312**, source seeds **192/128**, delta
**7**, amplitude **1**). It now owns turn-5 dispatch, shared HP/content,
ENDEAVOR routing, slot-0 PP reconstruction, and the turn-5 clock while
preserving the current legacy presentation continuation from that immutable
epoch. Clean-parent `b7cdbe46` (`75d9c1d3^`) app replays held the turn-4
primary, all turn-5/6 readers, and upstream turn-3 window byte-identical
(**1,841/1,841 raw RGBA captures**). Turns 1–4 and 5–13 are now retired; #39
remains open only for dispatcher debt. Dispatcher ladder status (2026-08-02): design dossier `docs/next-command-handoff-dispatcher-design.md` slices 1-7 are landed (generic guard chain drives turns 5-13; turn-1 and turn-2 epoch folds done; handoff state fields 13→2, only turn3/turn4 remain); slices 8-10 (turn-3/turn-4 folds, final 13-parameter/type cut) are the remaining #39 dispatcher work, then the species/episode render entry points inventoried in `docs/battle-scene-retirement-inventory.md`.
**Species render-entry-point program CLOSED (2026-08-03):** all 7 slices of
`docs/species-render-entry-point-retirement-design.md` landed — capstone
slice 4 (`90e5a2b2`) threads `SceneOffTurnView` species/asset identity as
data (differential 144/144 byte-identical, base `46190382`). Remaining #39
debt: the dispatcher-ladder remainder above. **The turnN-typeref retirement
program is CLOSED (2026-08-04, supervisor-verified):** all 8 slices of
`docs/battlescene-turnN-typeref-retirement-design.md` §4.1 are landed —
slice 1 `7ca03a17` (152→80), slice 2 chrome retirement + slice 3 idle-content
shim (80→68, pin test `a76bb338` extended), slice 4 closed-at-1/8 after the
re-scope recorded under §4.1's dependency chain (68→67), slice 5 `504070d2`
(67→62), slice 6 `723d8fa5` (62→47), slice 7a `f67b69e2` (47→41, Family R
34/34 done), slice 7b `88ddf84e` (41→**0**, Family P + Q idle trio + entry
point + all 7 bounce-tick helpers, −272 net lines). Slice 8's audit ran
supervisor-side 2026-08-04: census 0/0 in battleScene.ts/battleMenu.ts; every
remaining `Turn[N]CompletedResolutionNextCommandHandoff` mention lives in the
`turnNResolutionAdapter.ts` files (their own exported types, explicitly
in-scope-for-them per §4.1 row 8) and live tests pinning those adapters — no
dead fixtures to delete. Differential evidence across the program: every
slice byte-identical on its full window list (slice 7b alone: 8,199/8,199
captures across the §2.5 turn-1-13 list + insurance).
Rank 4 is **fully retired** (2026-07-31,
all 5 slices): `174cc388` ROCK_SLIDE tails; `441ddf83`+`6aba6662`
turn-7/8 FEATHER_DANCE staged+flipped; `0769ccc6` stat-fall banner
reads each turn's own staged stat; `40c969e5`+`ef971686` BIND
kickoff/miss onto staged facts (on-hit trap-start staged as kernel-only
receipt — the canonical line always misses; `{message,missMessage}`
bridge + additive entryLabel param landed). Rank 9 is **fully
retired** (2026-07-31, `3f850e37`): postwin fade + WIN-flip census
moved onto `terminalResolution`, four legacy Turn-17 clock mirrors +
dead `turn17.ts` deleted (`turn17MenuRedrawElapsed`'s live redraw
anchor was rehomed as `FightSubmenuState.menuRedrawElapsed`, then retired by
rank 8 in favor of the following-resolution owner's relative redraw edge). Rank-5
policy ADOPTED (user decision 2026-07-31; evidence
`docs/rank5-effect-visibility-scout.md`, plan in inventory row 5):
delete class-(c) move bodies on the OFF route, re-time class-(b)
choreography against fresh explicit-`oracleProfile` OFF pins, retiring
the legacy ON-profile turn9-12 pins as rank 5 executes. **Executed
2026-07-31 evening — all four move windows flipped** (`8802fcb6` turn
9, `329f8320` turn 10, `59a3fa7d` turns 11-12): OFF pins
231+256+206+255+131+83+256+256 all EXACT; residuals 177/233 (turn-9
pre-move), 189/191, 246/247 all attributed to ONE mechanism —
idle-bounce PHASE misalignment, fully root-caused in
`docs/idle-bounce-phase-attribution.md` (app seeds turn-9's bounce
reset 141 ticks late because upstream `TURN8_MENU_REDRAW_DELAY` is
still ON-fit 572 vs real OFF ≈434; verdict (b): closes as turns 1-8
get their own OFF re-timing under ranks 6-8, predicted constant
banked, not a rank-5 blocker). Eleven legacy ON turn9-12 pins retired
(turn9-menu.json 111/111 + turn12-menu.json 46/46 remain until the
phase family closes and their OFF pins can be banked — S9's landmark
data for them is in `docs/rank5-off-ground-truth.md`). **Rank-6 policy
ADOPTED (user decision 2026-07-31 evening, recorded in PROGRESS 799
addendum):** same shape for turns 1-4 — acceptance moves to the 10
banked OFF pins (`docs/rank6-off-ground-truth.md`), legacy ON turns
1-4 pins retire as rank 6 executes; turns 5-8 pins deliberately NOT
covered by this decision. **Slice 1 (turn 1) executed 2026-07-31
evening:** DOUBLE_TEAM's clone-blend and ROCK_SLIDE's rock-prop/camera-
shake/target-shake (class c, `Cmd_playanimation`'s `HITMARKER_NO_
ANIMATIONS` branch) deleted from turn 1's own window; the generic
stat-change banner and the generic hit-flash pair (class b) re-timed
against a fresh RAM probe (`tools/probe/dump-turn1-rockslide-off.py`).
OFF pins all EXACT: 81/81 + 230/230 + 256/256 + 102/102; four legacy ON
turn-1 pins retired (`git rm`). Turn-2 boundary insurance traces
(`turn2-endeavor.json`/`turn2-dragonbreath.json`) were found ALREADY
red on master pre-change (a pre-existing, unrelated generated-route
crash — confirmed byte-identical via `git stash`, not a regression
from this slice). **Slice 2 (turn 2) executed 2026-07-31 night (`4c793748`,
third attempt after two reverted investigations):** ENDEAVOR's attacker
squish/blend/droplets/hitsplat/target-shake and DRAGON_BREATH's own
target-shake/red-fade-blend/fire-projectile stream (all class c) deleted
from turn 2's own window; the cross-turn bounce bug (`turn2SubmenuBounceTick`/
`turn2KickoffBounceTick` hardcoding ON's `ROCK_SLIDE_MENU_REDRAW_DELAY`=664
instead of slice 1's OFF 429) fixed via a defaulted `redrawDelay` param
threaded through both functions plus their six turn-2-only call sites; every
surviving class-(b) ENDEAVOR/DRAGON_BREATH OFF timing constant pinned exactly
against a fresh RAM probe (`tools/probe/dump-turn2-dragonbreath-off.py`,
pressTick=2945): ENDEAVOR HP-drain start 116, healthbox-wobble anchor 81,
ENDEAVOR-to-DRAGON_BREATH text handoff 155/155 (a same-frame swap, NOT a
blank tick — the two prior attempts' own "156"/"single blank tick" claim was
an off-by-one in their own pixel scout, corrected here via direct oracle
comparison), DRAGON_BREATH hit-flash anchor 219, HP-drain start 254,
text-clear 285, menu-redraw 292. The blocker that stalled both prior
attempts (a ~1767px corruption on `wobbleY2`=-1 frames) root-caused as TWO
separate bugs, not one: (1) Onix's own hit-flash **flicker**
(`endeavorOnixInvisible`, class b, paired with the wobble via the identical
hit-flash anchor +1 — RAM-confirmed both signals first flip on RAM tick
3026/3027, the exact 118/119 relationship the ON fit already shows) was
missing entirely — the prior attempts' own analysis never considered it,
and the corruption was never actually about the wobble's sign, just
coincidentally correlated with it (both start the same RAM tick); fixed via
`eraseSpriteFootprint` (an existing shared primitive) whenever the flicker
is active. (2) `drawMenuHealthboxPlayer(fb, 0, dy)`'s translated-content
blit never erases the nominal (dy=0) position first — safe at every
existing call site (always composited over a fresh plain background) but
wrong here, the first caller compositing on top of `menuIdleBase`'s flat
harvest (which bakes the healthbox in at dy=0 already) — a real negative-dy
blit bug (the 103px even-parity residual both prior attempts flagged but
didn't isolate), fixed with a new `drawMenuHealthboxPlayerWobble` primitive
using the same erase-then-redraw two-pass shape `drawOpponentHealthboxWobble`
already established for the opposite side. Both fixes are pinned by a
Tier-1 test (re-timed "S7 slice E1 tail" block, AGENTS.md's negative-dy-blit
rule). Acceptance: `turn2-endeavor-off.json` 256/256, `turn2-dragonbreath-
off.json` 237/237, both EXACT; insurance `turn5-rockslide.json`/`turn8-
bind-a.json` 256/256 each, zero regression on `drawEndeavorSquish`'s/
`drawMenuHealthboxPlayer`'s still-ON callers. `turn2-{endeavor,endeavor-
drain,dragonbreath}.json` retired (`git rm`); `turn2-dragonbreath-
projectiles.json` kept (ISSUES #60 domain, untouched). **Slice 3 (turn 3)
executed 2026-07-31 night:** ENDEAVOR's attacker squish/blend/droplets/
hitsplat/target-shake and ROCK_SLIDE's camera-shake/target-shake/falling-
rock props (all class c) deleted from turn 3's own window, same treatment
slices 1-2 established; the generic ENDEAVOR healthbox-wobble+Onix-flicker
pair and the generic ROCK_SLIDE hit-flash pair (class b) survive, re-timed
against a fresh combined RAM probe (`tools/probe/dump-turn2-dragonbreath-
off.py`, reused verbatim - its fields are move-agnostic) plus a dense
`bin/oracle run`/PIL pixel scout for the two text-handoff/menu-redraw
boundaries: both landed EXACTLY at `docs/rank6-off-ground-truth.md` §5's
own estimates (`TURN3_OFF_ROCKSLIDE_MENU_REDRAW_DELAY`=525 vs the ~525
estimate). §20's own asymmetric-target-shake caution was moot as predicted
(class c, deleted). A genuine cross-turn bounce bug (turn 3's own reopened-
submenu/confirm-wait bounce chain, `turn3SubmenuBounceTick`/
`turn3KickoffBounceTick`, still hardcoding turn 2's ON-fit
`DRAGONBREATH_MENU_REDRAW_DELAY`=391 instead of slice 2's OFF value 292)
fixed via the same defaulted-param idiom slice 2 established, at the three
call sites in `battleScene.ts`'s generic dispatcher; the FROZEN plateau
constant (previously a `TURN3_KICKOFF_FROZEN_BOUNCE_TICK` module constant
that only coincidentally equaled the live formula's own freeze-moment
reading under ON) needed re-deriving as a live per-call computation, and
oracle-pixel grid search found the real hardware freezes at `pressTick+9`
(matching the ON-era doc's own "byte-identical through pressTick+9"
citation), not `pressTick+FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY`(+3) as the
generic formula's own naive continuation would suggest. Acceptance:
`turn3-endeavor-off.json` 254/255 (the sole residual is ISSUES #61, a
pre-existing action-menu/submenu reveal-boundary bug confirmed present -
worse, even - on unmodified master, unrelated to this window's own
ENDEAVOR/ROCK_SLIDE content), `turn3-rockslide-off.json` 161/161 EXACT;
insurance `turn5-rockslide.json`/`turn8-bind-a.json` 256/256 each, zero
regression. `turn3-{menu,endeavor,rockslide}.json` retired (`git rm`).
**Slice 4 (turn 4, FINAL) executed 2026-07-31 night:** DOUBLE_TEAM's
clone-blend (`drawDoubleTeamClones`) and ROCK_SLIDE's camera-shake/target-
shake/falling-rock props (all class c) deleted from turn 4's own window,
same treatment slices 1-3 established; the generic stat-change banner and
the generic ROCK_SLIDE hit-flash pair (class b) survive, re-timed against a
fresh combined RAM probe (`tools/probe/dump-turn4-doubleteam-off.py`,
pressTick=4925) plus a dense `bin/oracle run`/sha scout for the text-
handoff/menu-redraw boundaries. Every one of turn 4's own OFF timing
constants (stat-banner start/end/BG1-Y-anchor, stat-rose-text delay,
ROCK_SLIDE hit-flash anchor age, HP-drain start) landed EXACTLY the SAME
numeric value as turn 1's own OFF window (80/146/83/156/327/362) - a second
independent confirmation this whole DOUBLE_TEAM+ROCK_SLIDE choreography is
fixed post-kickoff overhead, not turn-specific; only the two post-drain
tail boundaries (text-clear 420, menu-redraw 427) differ from turn 1's own
(422/429), tracking this turn's own smaller HP-drain diff (40 vs 42) per
the ON-era doc's own already-established "smaller diff drains faster"
finding. `drawDoubleTeamClones` itself, along with its now-solely-used
helpers (`getDoubleTeamClonePalette`, `eraseGrovyleFootprint`), is fully
DELETED (DOUBLE_TEAM never recurs after turn 4 in this canonical battle,
so it has zero remaining callers) - a genuine class-(c) mechanism removal,
not just a call-site edit. The four shared functions slice 1 gave optional-
override params to exclusively for turn 4's own sake
(`statsBannerEva`/`statsBannerBg1Y`/`statRoseTextStartTick`/
`statRoseTextVisibleChars`) had those defaults removed (now required
params) once turn 4 also flipped, since no caller anywhere in the program
still needs the ON-fit default; their now-dead ON-fit module constants
(`STATS_BANNER_START_DELAY`/`STATS_BANNER_END_DELAY`/`STAT_ROSE_TEXT_
DELAY`) were deleted outright. The SAME cross-turn bounce-chain bug slices
2-3 each found one epoch upstream recurred one epoch further: turn 4's own
reopened-submenu/confirm-wait bounce chain
(`turn4SubmenuBounceTick`/`turn4KickoffBounceTick`) still hardcoded turn
3's ON-fit `TURN3_ROCKSLIDE_MENU_REDRAW_DELAY`(669) with no override
parameter at all - fixed via the same defaulted-param idiom, threaded
through the three generic-dispatcher call sites, now passing slice 3's own
OFF value (525) explicitly. The FROZEN plateau needed its own fresh grid
search (this session's own lesson (b): turn 4's case does NOT match slice
3's own `pressTick+9` finding, tried first and rejected - real hardware
freezes turn 4's own confirm-wait bounce at `pressTick-11`, a 9-tick-wide
plateau `[pressTick-15..pressTick-7]`, oracle-pixel grid-search-confirmed).
Acceptance: `turn4-doubleteam-off.json` **256/256 EXACT**, `turn4-rockslide-
off.json` **256/256 EXACT** (both fully exact, no residual); insurance
`turn5-rockslide.json`/`turn8-bind-a.json` 256/256 each, zero regression;
turns 1-3's own OFF traces re-verified zero regression too (turn3's own
ISSUES #61 residual unchanged, confirmed pre-existing not touched by this
slice). `turn4-{menu,doubleteam,rockslide}.json` retired (`git rm`).
Re-pinned `tests/fightSubmenu.test.ts`'s two turn-4-reopen tests at the
fresh OFF trace (`turn4-doubleteam-off.json` replacing the retired
`turn4-menu.json`, byte-identical segments) and `tests/battleScene.test.ts`'s
own turn-4 describe block (the turn-4-only clone-z-order pin tested content
that no longer renders under OFF - removed rather than re-pinned, since
there is nothing left to pin; the stat-rose-text-phase pin re-timed at the
fresh OFF boundary).

**Rank 6 is FULLY EXECUTED** (2026-07-31, all four slices): turn 1
`01eac159`, turn 2 `4c793748`, turn 3 `2e567316`, turn 4 this landing
commit. Every one of the ten `docs/rank6-off-ground-truth.md`-banked OFF
traces across all four turns now renders EXACT or with only the one
pre-existing, unrelated #61 residual (turn 3); every insurance trace held
zero regression at every slice. The idle-bounce phase family's turn-1-4
share (`docs/idle-bounce-phase-attribution.md` verdict (b), predicted
2026-07-31 evening) is now CLOSED: all four turns' own
`TURNn_..._MENU_REDRAW_DELAY`-shaped overcounts are re-timed against fresh
OFF ground truth, matching that doc's own predicted ~22-35% reduction
shape at every rung (turn 1: 429/664≈65% of ON, turn 2: 292/391≈75%, turn
3: 525/669≈78%, turn 4: 427/661≈65%). The remaining phase-family share is
turns 5-8 (their own future rank/policy, not started here).

Earlier
progress:
`turn13-sandattack.json`'s complete captured
SAND_ATTACK content now resolves its kickoff and opponent-target accuracy-fall
text from the staged real kernel event stream through the generic stat-down
bridge (`e50bf210`, **190/190**); all four raw turn-13 text literals were
deleted. Its later DRAGON_BREATH half is a separate, still-unwired window.
Resolution Slice 6 (`985ec1fa`, `ae94cc4c`) also retires the Turn-17
KO/result/trainer-loss render dispatch: the exact adapter consumes an immutable
typed terminal boundary, frozen result/loss strings, and presentation-relative
dismiss clocks without inspecting a turn flag (**255/255, 147/147, 255/255,
118/118**). The old post-win fields are still mirrored for the downstream
canonical post-win owner, so this entry remains open.

**Worklist:** `docs/battle-scene-retirement-inventory.md` (folded 2026-07-30)
carries the reproducible census, the remaining owner chain with line ranges,
and the per-slice ordering. Cite it — and re-run its commands to record both
the ref count and LOC — when opening the next retirement slice.

**Not a request to rewrite it.** The windows it renders are individually
oracle-exact and that evidence is worth keeping. The debt is the *keying*.
ROADMAP S10 §3 requires one already-exact window to be re-driven from semantic
events as a proof of the seam; that conversion, window by window, is the
retirement path. AGENTS.md already forbids adding new turn-keyed branches.

**Rank-7 locked-action grouping landed (2026-08-01, `b464a6e7`,
`72546da6`):** Factory fresh start now owns the source option boundary:
`battleScene: "off"` initializes `HITMARKER_NO_ANIMATIONS` exactly once while
standalone callers choose explicitly. The generated round route selects OFF.
Full-turn message receipts freeze Cmd_printstring's attacker/current move/move
position, so `STRINGID_USEDMOVE` never needs to discover a same-action PP
receipt; snapshot-less staged fixtures retain their old compatibility bridge.
The driver stops at a real follow-up trainer command and appends that untouched
AI/reducer receipt as a second immutable resolution segment. Fixed generated
Taillow FLY proves charge text, hide through the opponent action, locked no-PP
FLY text, restoration, and request 4; fresh seam coverage also pins
Assist-called FLY and opponent ownership. Thus rank 7's typed two-turn group
is closed. The later owner handoff below also retires its exact renderer
mirrors.

**Rank-7 opponent-owner bridge landed (2026-08-01, `30b61236`, `fea91d54`):** a new
source-driven adapter stages the exact Onix/Murkrow boundary under Scene OFF
through the production full-turn reducer. It publishes the charge/hide/
airborne-miss receipt, then preserves the real intervening player request and
publishes the locked strike/restoration/4→0/faint/forced-request receipt. The
legacy exact renderer now consumes the charge, strike, and faint lines from
those typed commands, and core constructs its forced selector from genuine
request **4** (legal slots **1/2**) rather than `CANONICAL_FORCED_SWITCH_REQUEST`
request 0. The live round presenter now retains that charge resolution under
the generic locked battler/current-move/PP-slot identity while the genuine
player request owns its own command UI. Submission reclaims the owner and
appends the untouched strike receipt; no second PP write occurs, visibility
restores from the immutable first segment, and a typed forced request advances
the existing generic `PartySelectState` directly. The old one-segment selector
guard is gone. Scene ON/OFF logical outcomes and the seven-battle cursor
regression are pinned. `8caad013` additionally hardens recharge and Bide
action snapshots, and merged OFF evidence `adfb746c`/`49e18075` records the
124-capture inverse lifecycle.

**Rank-7 exact owner mirrors retired (2026-08-01, `1f276c95`, `c0821a65`):**
the canonical adapter now appends the strike to the same immutable charge
resolution identity. A typed compatibility owner carries that resolution and
only its published forced selector; segment ownership selects charge versus
strike presentation, and the source receipt supplies PP. `turn14Resolved` and
`turn15PartySelect` are deleted from production and tests. Differential app
replay against clean `8caad013` preserved every ordinary and +30 delayed
historical capture byte-for-byte: charge **213**, strike **256**, selector
**200/200**, five send-out rungs **43/46/16/144/195** and their delayed twins,
**1,496 captures** total. The reproducible census falls **2,526→2,506 refs**
and **33,135→33,125 LOC**. No mechanics/RNG/AI/outcome, animation, trace or
capture list, ratchet/barrier, recording import, or prohibited selector was
added. Rank 7 is closed; #39 remains open at rank 8 and earlier mirror debt.

**Rank-7 generated-route addendum (2026-08-02):** regression bisected to `b464a6e7` and root-caused in `docs/generated-route-canary-regression.md`; `ecd00a9c` restores the missing source-owned Scene-OFF attack-pause receipt and the **128/128** canary while the canonical rank-7 differential remains byte-identical.

**Rank-8 Scene-OFF status-icon receipt landed (2026-08-01, `80c5d6af`):**
the generic resolution presenter now keeps `set-battler-status-data` as the
logical raw write and projects the existing `status-icon-update` as an
immutable one-callback `status-icon` command (`battler`, `status1`, `status2`,
and event sequence). The displayed healthbox status and the round controller's
`displayedStatus1` commit only when that receipt completes. The text resolver
gets `B_EFF_NAME_WITH_PREFIX` from the immediately pending raw status target,
not a move/species inference. A legal generated Factory route proves the
nonterminal burn order through the real command/presentation seam and next
request; the Scene-OFF event list deliberately contains no status-animation
receipt. The authoritative oracle evidence remains the already-verified
**42 captures / 42 capture-states** in
`docs/fire-punch-burn-lifecycle-off-evidence.md`, not a new pixel claim.
**Rank-8 exact owner mirrors retired (2026-08-01, `d410cfe5`):** the exact
post-switch MAGBY/MURKROW boundary now runs through the production full-turn
reducer at the documented eight-call RNG cursor. Its immutable resolution
owns FAINT ATTACK damage, FIRE PUNCH damage/PP, raw burn, burn text, the
one-callback status-icon receipt, residual damage, and genuine next command.
The compatibility owner retains that following resolution and its relative
redraw edge until the already-typed terminal owner begins. Deleted
`turn16Resolved` and `FightSubmenuState.menuRedrawElapsed`; no replacement
episode selector was added. Clean-`60acda9c` differential app replay held the
requested Turn-16/Turn-17 rungs byte-for-byte (**2,041 captures**), plus the
delayed Turn-16 rung and Turn-17 rung 6b (**2,163 total**). Census falls
**2,506→2,496 refs / 33,125→33,124 LOC**. Rank 8 is closed.

**Opponent-faint presentation owner retired (2026-08-01, `ef1aa50f`):** the
nonterminal PIDGEOTTO-faint/MURKROW-switch-in lifecycle now owns its accepted
A edge, frozen cursor, and edge-relative continuation as one immutable typed
receipt. The old loose clock and every alias/thread are gone; the four legacy
app replays remain byte-identical (**141 + 242 + 256 + 223 = 862** captures).
#39 remains open only for the next-command dispatcher debt inventoried in
`docs/battle-scene-retirement-inventory.md`. **Dispatcher migration update
(2026-08-02): slices 1–6 are complete.** The generic receipt/content bridge
and reopen guard own production turns 5–13, including the retained FLY owner;
it now also owns turn 1's immutable HandleInputChooseAction/DoBounceEffect
epoch and field content. The first early state field is cut (four handoff
fields to three).

**Dispatcher ladder CLOSED — all ten slices (supervisor-verified 2026-08-08).**
The paragraph above used to say slices 7–10 remained; that text was six days
stale. A worker briefed on "slice 7" correctly reported the step was already
landed, and the supervisor confirmed it independently:
`3a3a168a` (bridge turn-2 epoch content) + `8518520b` (fold turn-2 state) are
both ancestors of master, `tools/census-next-command-handoffs.sh` reports
**0** `BattleSceneState` handoff fields, **0** `drawFightSubmenuWindow` handoff
parameters and **0** `currentPPForActiveMon` parameters, `grep` finds **0**
`turn<N>Resolved` fields and **0** `Turn<N>CompletedResolutionNextCommandHandoff`
imports in `battleScene.ts`/`battleMenu.ts` — that is slice 10's own final-cut
acceptance, met. `docs/battle-scene-retirement-inventory.md`'s state-field
table still lists `turn1Resolved…turn4Resolved`/`turn9Resolved…turn13Resolved`
as live; those rows are stale, not open work.

**What is actually still open in #39.** The turn-keyed *dispatcher* is gone;
the per-species *render entry points* are not. `battleScene.ts` is now
**36,897 lines** (it was 17,056 at the 2026-07-24 census — it more than doubled
while the ladder ran) with **848** remaining `turn<N>` textual references, none
of them state fields. The bounded successor program is
`docs/species-render-entry-point-retirement-design.md` (45 census'd entry
points, 7 slices); its slices 3 and 4 were GATED on ladder slice 10 and are now
ungated. **Check each slice's premise before briefing it — that dossier is also
partly stale:** slice 1's `PIDGEOTTO_MAX_HP` literal is already
`TURN5_SWITCHIN.replacementHp.max` (only `murkrowHealthboxContentForHp`'s
`hp === 142` cache-miss literal remains), and slice 5's entire `turn15Onix*`
symbol cluster no longer exists. Slice 2's six healthbox factories are
confirmed still present and unparameterized.

**Two staged bare fact sources retired (2026-08-08, `5de9c142`).** Turn 5's
ENDEAVOR squish/field path now consumes `TURN4_ROCKSLIDE_HP.to`, the typed
41→1 endpoint from `resolveTurn4RockSlideHpEndpoints()`. Turn 11's ATK-floor
renderer and visible-character total now share the lines produced by
`resolveTurn11AtkFloorLines()`. The old HP scalar plus both bare string
exports, their compatibility imports/re-exports, and literal-only tests are
gone: exact old-symbol executable production refs **12→0**; the reproducible
broad #39 inventory moves **1,950→1,949** matching lines and
`battleScene.ts` **36,344→36,343 LOC**. Differential replay against the clean
parent is **2,529/2,529 byte-identical** across the affected turn-4, turn-5,
turn-11 and upstream-reader OFF windows. The remaining #39 render-entry debt
above is unchanged.

**Family-C cache-key ownership hardened (2026-08-08, `660c769f`).** The six
healthbox factories parameterized by species-render-entry-point slice 2 had
kept their older partial memoization keys, so equal HP/status/gender could
return pixels composed for a different name, level, or max HP. Their keys now
include every variable compositor input (HP, name, level, max HP, gender, and
status where exposed), and the KABUTO, ONIX, and MAGBY canonical preseeds use
those same complete keys. Six Tier-1 collision pins call each factory with two
identities/max-HP values under the same partial state in both orders and compare
every result directly to `composeOpponentHealthbox`/`composePlayerHealthbox`;
all six pins failed before the production edit and pass after it. Incomplete
Family-C cache owners move **6→0**. This hardening does not retire a turn-keyed
renderer, so the reproducible broad #39 inventory honestly stays
**1,949→1,949** matching lines while `battleScene.ts` grows
**36,343→36,361 LOC**. Clean-parent OFF differential replay is
**3,055/3,055 byte-identical** across all 16 slice-2 windows plus
`battle-command-generated-off`; no canonical Battle-2 window was run. The
remaining #39 render-entry debt above is unchanged.

**Faint-sink geometry helper renamed generically (2026-08-08).** The remaining
species-agnostic pure helper is now `faintSinkRowsAndY2` in its existing
`battleSceneCanonical.ts` owner and public `battleScene.ts` re-export. Its
signature, Grovyle defaults, formula, and explicit Pidgeotto re-anchoring are
unchanged; focused Tier-1 pins cover both distinct `startTick`/`steps`
parameterizations without identity input. Exact old-name references across
`src`/`tests`/`tools` move **22→0** (production **10→0**); no computed/string
consumer was found. This ownership-only rename leaves the reproducible broad
#39 inventory **1,949→1,949** and `battleScene.ts` **36,361→36,361 LOC**.
The remaining #39 render-entry debt above is unchanged.

**DOUBLE_TEAM clone-palette cache made identity-honest (2026-08-08,
`ba08db85`).** `getOnixDoubleTeamClonePalette` is now the species-neutral
`doubleTeamClonePalette`; its `WeakMap` memoizes by the actual source-palette
array rather than returning the first palette for every later asset. A
red-verified Tier-1 collision pin feeds two distinct synthetic palettes in both
orders and compares each result with the direct coefficient-11 blend. Exact old
helper/cache executable refs move **3+4→0**; Family-F species-named factories
move **2→1**, source-accepting singleton caches **2→1**, and incomplete
DOUBLE_TEAM cache owners **1→0**. `turn10OnixDarkPalette` and its cache are
unchanged. `battleScene.ts` moves **36,361→36,363 LOC**; clean-parent OFF
differential replay is **640/640 byte-identical** across turn-4 DOUBLE_TEAM,
adjacent ROCK_SLIDE, and generated-command insurance. The remaining #39
render-entry debt above is otherwise unchanged.

**Next Family-F owner audited read-only (2026-08-08).** The remaining
`turn10OnixDarkPalette` accepts a source sprite but memoizes one module-global
palette, so it has the same latent cross-identity collision. It is not currently
reachable from `renderSceneOffTurnView`; both canonical OFF AERIAL_ACE callers
explicitly pass `darken=false`, while the pure coefficient-10 transform remains
live separately in the Scene-ON renderer. The next bounded cleanup should rename
only this wrapper, use a `WeakMap` keyed by the source palette array, and add the
same two-palette/both-orders red pin beside `doubleTeamClonePalette`. Use the
three turn-10 OFF traces as **592-capture canaries**, not as a claim that OFF
currently exercises the cache; never add a staged darken field or revive the
absent OFF palette pulse merely to manufacture dynamic acceptance. Leave the BG
cache, pure transform, and Scene-ON callers untouched.

**Deferred behind S10 closure (2026-08-08, user decision).** #39 is demoted to
filler until ROADMAP S10's six gates are checked — see the 2026-08-08 user
ordering decision in ROADMAP.md (barrier burn-down A3–A12, then the bucket-B
item, then the Gate-6 close-out artifacts). The audited `turn10OnixDarkPalette`
slice above remains the next #39 owner whenever a filler slot opens; nothing
here is canceled.

# Settled records (not open work — see the note at the top of this file)

## #87 — Battle-start ready-frame formula's pre-first-turn span (universal +4..+7 tick late-fire) — mechanism record + standing rule

**SETTLED RECORD for the mechanism; option (c) EXECUTED (2026-08-15) for
the only window that currently needs it.** Kept for the *why* behind
`MEASURED_SILVER_BRAIN_REVEAL_READY_LAG_OFFSET` (`battleScene.ts`) and as
the standing rule for any FUTURE compare window whose capture range grows
to cross the ready transition — do not reopen or re-run the evidence
program below without a new crossing window; see the trimmed dossiers
(`docs/trainer-pic-off-window-scout.md`, `docs/ready-lag-discriminator-scout.md`,
`docs/ready-lag-confound-fixture.md`, `docs/overrides-ready-lag-probe.md`)
for the full rounds-13-17 archaeology if the mechanism itself is ever in
question again.

**Mechanism:** the app's predicted first-action-menu-ready frame
(`generatedBattleStartCommandReady` family, `src/engine/battleScene.ts`)
fires 4-7 ticks EARLY relative to the oracle's real menu-open, universally
(every fixture tested, not just a `dispatchDelay<101` regime — that and
every other single-factor discriminator tried was falsified). Source
location: `TryDoEventsBeforeFirstTurn`'s switch-in ability/item/weather
loop plus `HandleTurnActionSelectionState`'s `ChooseAction` dispatch/AI-ack
round trip (`reference/pokeemerald/src/battle_main.c`) run between send-out
completion and menu interactivity — a real ROM span the formula has no
term for. The residual is the sum of two legs (tick-split instruments:
`tools/probe/probe-readylag-span-tickbytick.ts`, `...-plus7.ts`): a
switch-in-loop leg ∈ {3,4} and an AI-ack leg ∈ {2,3} — the AI-ack leg is
`AI_TrySwitchOrUseItem` (`battle_ai_switch_items.c:528-603`), a single
non-yielding call whose 2-vs-3-tick spread is raw ARM7TDMI cycle-cost
spill against the frame boundary; the switch-in-loop leg's 3-vs-4 split
survived falsification of every named candidate (Quick Claw, weather
carryover, `SwapTurnOrder`, all 12 active-lead switch-in abilities/items).
**Neither leg is predictable from source-visible properties** — modeling
either needs instruction-cycle counting this harness has no tool for.

**Standing rule for a future crossing window:** when a NEW committed
compare window's capture range grows to cross the ready transition (this
is about the *window*, not the underlying mechanism — most committed
windows end before it and are unaffected), calibrate that window alone,
per the user's 2026-08-14 option (c) decision (recorded in
`ROADMAP.md`'s 2026-08-14-eve decision block):
1. Measure the fixture's actual ready lag with
   `tools/probe/probe-ready-lag-chooseaction-handshake.ts` (formula-relative
   residual) and `tools/probe/probe-readylag-span-tickbytick-plus7.ts`
   (raw leg split) — add the fixture as a new scenario/trace entry in each,
   don't fork the probe.
2. Key the calibration off an EXISTING sanctioned route-level fact (e.g.
   `frontierBrain.status`), the same way `isCanonicalAnchorIntro` already
   selects `GENERATED_PLAYER_READY_LAG` — never a battle-number/turn-number
   /absolute-tick/trace-name branch.
3. Resolve the exact integer against that window's own dense compare
   (`npm run compare`) — the two RAM probes bound the right neighborhood,
   but their oracle-tick domain and the reducer's own button-press-relative
   `elapsed` clock carry a few ticks of unmodeled skew neither resolves
   alone; this is the same "value the committed pin needs" convention
   `GENERATED_PLAYER_READY_LAG` itself already uses.
4. Label the constant MEASURED, NOT DERIVED in code (name the probes and
   measured legs), and prove every OTHER committed window is untouched:
   its own dense compare stays at its recorded number, and
   `npm run compare:differential` is byte-identical on windows ending
   before their own ready transition.

**Precedent (silver Frontier-Brain reveal, 2026-08-15):** the only window
that currently crosses the transition. RAM-handshake formula-relative
residual +6; leg-split raw span 4 (switch-in-loop) + 3 (AI-ack) = 7,
matching the PUPITAR/DELCATTY +7 fixture's own split. Dense-compare
calibration against `factory-round-battle7-noland-reveal-off` settled on
`MEASURED_SILVER_BRAIN_REVEAL_READY_LAG_OFFSET = 9`, keyed off a new
`isSilverBrainReveal` fact (`frontierBrain.status === "silver"`,
threaded through `FactoryBattleStartIntroState` in
`beginFactoryRoundBattleStartIntro`). Compare: silver reveal 648/701 →
**690/701**; gold Noland dense stays 700/701 (`frontierBrain.status`
differs, offset never applies); differential PASS (1656/1656 identical)
on Yoshi/Lukas/Magneton, which all end before their ready transition.
The remaining 11/701 silver frames (420, 503 — present identically with
NO offset applied, i.e. pre-existing and unrelated to readiness; 647-655
— a render seam right at the not-ready/ready boundary, offset-invariant
in width across every offset tried) are a separate, out-of-scope gap this
constant cannot close at any value — an honest cap, not a #87 residual.


## #97 — [SETTLED 2026-08-19, supervisor decision] turn5/turn6 presentation-parity family: every window CLOSED or at its evidence-backed accepted ceiling

**This is a settled record, not open work.** The 2026-08-17/18/19 instrument→fix
assembly line (13 fix + 12 instrument bounded-worker rounds across three
supervisor sessions) closed the whole family. Final counts, all
supervisor-verified live:

- CLOSED FULL BARS: `turn5-resolve-off-a` **196/196**, `-b` **196/196**,
  `turn5-confirm-off-a` **132/132**, `turn5-action-off` **32/32**,
  `turn6-reopen-off` **46/46**, `turn6-menu-off.json` fixture **47/47**,
  `turn5-reset-off` 256/256 (control, never moved).
- ACCEPTED CEILINGS (each residual frame root-caused; no actionable fix):
  - `turn5-resolve-off-c` **195/196** — tick 6763 (6px/0.02%) **PARKED
    2026-08-19, supervisor decision**: three probe sessions exhausted every
    candidate (per-sprite clip is mathematically a no-op; VRAM content is
    byte-exact; hardware-OAM timing unresolvable at `oracle.advance()`
    granularity). Evidence: `docs/turn5-single-frame-residuals-diagnosis.md`
    §1/§8/§11.
  - `turn5-resolve-off-d` **194/196** — tick 6850 = the accepted
    "PNG(T) shows RAM(T-1)" dispatch-boundary class (same doc §2); tick
    6996 = accepted "post-redraw single-scanline capture tear" class
    (app == oracle at both neighbors; oracle uniquely shows the same static
    content shifted down 1 scanline for exactly one tick; same doc §11).
  - `turn5-confirm-off-b` **131/132** — tick 6184 = the same accepted
    PNG(T)=RAM(T-1) boundary class (same doc §4).
- `loss-terminal-decline-continuation-off`'s old 155/155 bar is **OBSOLETE
  by design** (continuous-play chaining, commit `b7ae30de`, user-approved
  2026-08-14): the post-edge farewell/Lobby span is unreachable under
  `generated-orchestrator`. Honest bar: pre-edge 4939-4988 = 50/50 (holds).
  A future byte-exact farewell window needs a NEW trace capped before frame
  4989, not a change to this one.

Root-cause classes landed across the family (full narrative in
`docs/turn5-resolve-ab-pools-diagnosis.md` §1-§21,
`docs/turn5-single-frame-residuals-diagnosis.md` §0-§11,
`docs/turn5-bounce-recalibration-probe.md`, and
`docs/turn6-reopen-endstate-spec.md`): bounce sine-index offsets with t-1
display basis (+60/+109/+116 family, plus the confirm-wait live-driver -21);
Battle-Scene-Off gating of whole move-animation scripts (BG3 shake + phantom
rock props); 2-tick sink/healthbox-vanish/HP-sliver anchor lags; 1-tick-early
fainted-text dispatch + glyph reveal + cursor onset (missing t-1 basis);
turn-5 missing from the shared kickoff-text -1 ternary. Every fix is
Tier-1-pinned (red-verified) and guarded by the 16-trace zero-decrease
family; the accepted-class ceilings above are the ONLY reason any of these
compares sits below full.

Do not reopen any of this without new evidence: re-run the rerunnable-guards
blocks in the two diagnosis docs first; if a count differs from this record,
that is a regression, not this entry reopening.


## #56 — [SETTLED 2026-08-03, supervisor decision] Arbitrary-trainer intro: YOSHI 700/751 + MAGNETON 703/751, every residual frame in a settled class

**Symptom:** the public dense arbitrary-trainer intro comparison
(`factory-arbitrary-intro-yoshi-off`, YOSHI/COMBUSKEN) now stands at
**700/751** (up from 650/751; frame 536 fixed 2026-07-31 evening) with every divergent frame
characterized in `docs/trainer-pic-off-window-scout.md` §D. Remainder:

1. **RESOLVED non-universal; route term retained (2026-08-01).** The
   species formula remains proven on GRIMER/KADABRA/DELCATTY/lab-ONIX.
   Reusable Scene-OFF RAM evidence now names the complete controller tail:
   canonical ONIX is completion **1738** → both `CHOOSEACTION` bits **1741**
   → player-only **1744** (+3/+3); staged YOSHI is **1847→1850→1853**
   (+3/+3), but the committed same-player-species staged ONIX fixture is
   **1885→1888→1890** (+3/+2). Thus the dispatch/AI-resolution mechanism is
   shared, while its duration is decision-dependent—not one universal six-
   tick constant. `isCanonicalAnchorIntro`'s existing calibrated route term
   stays; no species/trainer/tick selector or speculative production change
   was added. Reproducer and interpretation:
   `docs/issue56-plus6-route-term.md` main-lane follow-up and
   `tools/probe/dump-canonical-anchor-readylag-ram.py`.
2. **Frame 536 RESOLVED** (2026-07-31, `7467636e`: call-site bug —
   pre-player-release `drawBallIcons` used the raw opponent-handoff clock;
   YOSHI 700/751, ablation-verified Tier-1 pin). **Frame 444's bar/icon
   display tail is SETTLED — same #5/#61 sub-tick class** (2026-08-01,
   supervisor decision; `docs/issue56-display-latch-event-design.md`): the
   source destroys the summary bar and every icon inside ONE foreground
   callback (`battle_interface.c:1740-1768`), so MAGNETON's observed
   two-tick bar/icon split can only be VBlank interposing mid-callback — a
   CPU/VBlank phase fact, not a source-owned tick-granular lifecycle. Raw
   elapsed, terminal task state, destroy order, and pending OAM are all
   falsified discriminators (Round 4 evidence + the design doc §2; YOSHI
   and intro-off share equivalent terminal state yet need opposite bar
   tail clocks). Do not fit a phase bit or per-widget clock unless the
   design doc's §4 falsification gate succeeds; §3 then has the bounded
   plan. **Frame 444's separate materialize-column-shift lead is RESOLVED**
   (2026-08-02, `1aa13ebb`; `docs/issue56-residual-probe.md` Q1 RAM
   follow-up): live sprite + hardware OAM/matrix exonerated the opponent
   affine path and attributed the defect to the generated Scene-OFF
   ball-open particles sampling one step early at logical tick 13. The
   arbitrary generated route now publishes the logical-13 stall directly;
   the audited canonical-anchor route retains lag 1 through its existing
   route fact. Dense 440:450 changes only frame 444, whose diff shrank
   **219px → 18px** as exactly **201** app pixels changed; the remaining 18
   are the settled display-tail class above. The idle-menu-bounce family
   stays closed as no-app-bug (2026-07-31, `432e16aa`; narrower follow-up
   lead banked in the probe doc's Q2 addendum).
3. **RESOLVED (2026-07-31, `7cfef2d7`).** `gEnemyMonElevation` extracted
   (61 species sparse, absent = 0, isolated extractor test) and the
   solved rule `origin.y = 8 + yOffset − elevation` applied at all three
   settled-opponent draw sites (release, player-release view, command
   view); the elevated shadow now persists into the command phase
   (previously intro-only — MAGNETON's shadow was missing entirely at
   the menu). **MAGNETON 424 → 703/751; shadow branch verified**; YOSHI
   699/751, 715/715, 128/128 all held. Remaining MAGNETON tail (~48
   frames) is a pre-existing species-independent periodic idle-menu
   bounce family also present inside YOSHI's accepted tail — folded into
   item 2's isolated-residual class (444/536 + idle-bounce family).

**Closure audit (2026-08-02, `d87b5e92`,
`docs/issue56-closure-audit.md`):** YOSHI holds **700/751** and all 51 red
frames sum into the two settled classes (1 display-tail + 50 idle-bounce) —
no remainder. But **MAGNETON regressed 703→702**: frame 437 (201px, bbox
163,40-196,85) is NEW, root-caused (code-cited) to `1aa13ebb` (2026-08-02)
keying the ball-open particle `stallLag` on `isCanonicalAnchorIntro`, which
gives YOSHI and MAGNETON the same `stallLag: 0` although the 2026-07-31 OAM
probe (`docs/issue56-frames-444-536-oam-probe.md` Round 2) proved MAGNETON
wants the opposite value at the analogous tick — and `1aa13ebb`'s landing
never re-ran the MAGNETON comparison.

**MAGNETON regression FIXED (2026-08-03, main lane).** `isCanonicalAnchorIntro`
can't discriminate COMBUSKEN (wants `stallLag` 0) from MAGNETON (wants 1) —
both are non-canonical generated routes. Neither evidence doc ever produced a
species/cry-duration formula for this specific mechanism (the closure audit's
own "Not fixed" section calls it "whatever real per-fixture fact actually
separates COMBUSKEN...from MAGNETON", and Round 2 Part A explicitly parked the
RAM probe needed to find one as "not attempted this round"); since
`generatedBattleStartOpponentHandoffTick` already normalizes out the only
species-dependent delay this subsystem knows about, the remaining split is an
honest per-route real-clock phase-alignment fact, the same class ISSUES #56
item 2's own design doc already named for its sibling display-tail mechanism.
`generatedParticleStallLag` (`src/engine/battleScene.ts`) now keys the
generated-route branch on the opponent's own species (a small, explicitly-
scoped, evidence-extendable set — currently just MAGNETON — mirroring the
existing `elevatedEnemyShadowSpecies`/cry-duration-map pattern already in this
file) instead of collapsing to one boolean. Re-verified fresh:
`factory-arbitrary-intro-magneton-off` **702→703/751** (frame 437 green),
`factory-arbitrary-intro-yoshi-off` **700/751 held** (frame 444 unchanged at
its settled 18px display-tail residual), `interactive-generated-intro-off`
**715/715** and `battle-command-generated-off` **128/128** both held. Tier-1
pin: `tests/issue56ParticleStall.test.ts`. Both fixtures now match their
documented, audited baselines exactly — #56 is a clean candidate for
settled-record closure; nothing else in this entry is open.

**Not blocking:** Gate 5 ticked with these named (ROADMAP S10 gate 5
completion note); this is the worklist to finish the window honestly.


## #61 — [PARKED 2026-08-01, supervisor decision] Scene-OFF turn-3 FIGHT
  reveal one-frame residual: controller/VBlank poll order is sub-tick CPU
  phase — same settled class as #5/#38

The turn-3 FIGHT opening reveals one frame later in the oracle because the
real player controller's DMA-busy poll lands before the final VBlank drain on
that opening only, while all four openings enqueue identical `9/11/6` BG-copy
batches. `docs/issue61-fight-submenu-reveal-boundary.md` (RAM/source
evidence + queue-slot follow-up) and `docs/issue61-vblank-phase-event-design.md`
(2026-08-01 design evaluation) establish that no tick-level, source-owned
state predicts the poll/drain order — it is CPU instruction/cycle phase
relative to `VBlankIntr`, the same architectural class as #5's settled
`SetGpuReg` race. Three candidate designs were evaluated; any producer fed
from turn/tick/cursor/queue-size/payload facts would be a fitted exception
(rejected). Affected acceptance: `turn3-endeavor-off.json` ships **254/255**
(sole residual, reveal frame); `turn3-rockslide-off.json` **161/161** and
every turn-1/2/4 OFF window remain exact. Do not fit a phase bit and do not
retune `FIGHT_SUBMENU_OPEN_DELAY`. Reopen only if the design doc's §4.1
instruction-ordered VBlank watch finds a stable tick-granular source-owned
phase proxy, or the engine gains a general cycle/register-queue model; §3 of
that doc then gives the bounded five-slice implementation plan.

## #38 — [PARKED 2026-07-22, supervisor decision] Turn 16 FAINT_ATTACK
  delayed-control tick 21006 exposes `BLDALPHA` one VBlank early

The canonical animation window is committed at **221/221 exact**
(`turn16-rung2a.json`, 20826-21046). A +30-frame pre-SEND-OUT delay is
**220/221**: delayed tick 21006 alone shows the next attacker-alpha
coefficient one frame early.

Direct task/RAM probes show identical active callbacks and task data at the
relative boundary (`data[1]=0x0d03`, `data[2]=0`), while the hardware register
differs: canonical `BLDALPHA=0x0e02`, delayed `0x0d03`. A fresh delay sweep
over `+0..+8,+15,+16,+30,+31,+32` reproduces the early exposure only at
`+30`; adjacent delays return to the normal cadence. This is therefore a
sub-tick `SetGpuReg`/VBlank visibility race below the engine's tick-state
abstraction, analogous in mechanism to the already-settled cycle-timing
family in #5, not a move-task reducer defect.

The delayed trace is not committed red. Do not add an absolute-tick,
delay-specific, or baked-frame patch. Reopen only if the engine gains a
general cycle/register-queue model; this extra delayed-control frame does not
block the roadmap's canonical S7 acceptance.

## #18 — [POLICY SETTLED 2026-07-19, user decision] sendout tick 1496
  (particle z-order, 3px): accepted/parked permanently; S6 ticked [x] with
  every diff frame individually attributed (3× #5, 1× this entry). The
  persistent-`sSpriteOrder` architecture build was declined as out of
  proportion. No further fix attempts unless the user re-opens it.
  Mechanism record below is kept for attribution evidence.

Parked 2026-07-19 (supervisor); trimmed 2026-07-19 (§7.31, closed tick
1493); trimmed again 2026-07-19 (§7.32, closed 1494/1495 - a one-tick
`drawOpponentSummaryExit` clock stall, same family as §7.18's particle
stall). What remains is exactly one tick:
- **1496** (3px): particle z-order gap named in §7.25 — the ONE
  non-ISSUES-#5 frame keeping `s6-acceptance.json` at 224/228. §7.31
  RAM-confirmed the pixel-exact winner (spawn index 14, not 13) and ruled
  out sprite-slot reuse scrambling (real array positions: idx6 for particle
  13, idx23 for particle 14 — NOT scrambled). §7.32 read the actual source
  this residual depends on (`reference/pokeemerald/src/sprite.c`'s
  `CreateSprite`/`CreateSpriteAtEnd`/`SortSprites`) and found: (1) the
  particles are created via plain `CreateSprite`, not `CreateSpriteAtEnd` as
  previously assumed (`CreateSpriteAtEnd` is real in this scene but only for
  the summary bar's icons and the healthbox, `battle_interface.c`); (2) the
  real tie-break mechanism is `sSpriteOrder` — a PERSISTENT 64-slot
  permutation reset to identity only once (`ResetAllSprites`, battle start)
  and continuously insertion-sorted in place every frame thereafter, where
  an exact tie preserves whatever relative order two slots inherited from
  the *entire prior history* of every sprite (of any kind) that has ever
  occupied those two slot numbers — not a function of raw spawn/slot index
  at all. Determining the real winner for slots 6 vs. 23 at this one tick
  would require simulating that entire scene-wide history as persistent
  engine state, a materially different architecture (whole-scene OAM-order
  simulation) than this engine's current per-burst, stateless
  `sortAliveParticlesByScreenY` — out of proportion to a 3px fix and exactly
  the kind of change that risks regressing every other window sharing that
  sort. No fix shipped (a special-cased index swap would be undocumented
  curve-fitting, the same mistake §7.25 already made and reverted). Full
  derivation: `docs/battle-scene-notes.md` §7.32.
Affects: `sendout.json` 255/256, `s6-acceptance.json` 224/228 (3 frames are
ISSUES #5's settled pattern, x88-151-confirmed; 1 frame is #18's own 1496).

## #5 — [POLICY SETTLED 2026-07-17, user-delegated] mon-pic close WIN0V
  jitter: 0-diff stays the bar; re-time trace interactions into clean
  windows where feasible; otherwise ship with each non-matching frame
  individually attributed to this entry's pattern (x88-151 close-window
  confinement). No further fix attempts. rent-slot1.json: RESOLVED to the
  attribution fallback (supervisor, 2026-07-17 ~16:20) — a worktree worker
  swept 8 re-time candidates around the archived "~31" window (confirm
  press-ticks 29-35, incl. DOWN-tick variations; ~47+ stays excluded, it
  blows the species-name-breathe budget): EVERY candidate was worse than
  the committed baseline (15-27 diffs vs baseline's 14), no exploitable
  pattern — consistent with the chaotic cycle-cost root cause below.
  rent-slot1.json ships at 125/139 permanently, all 14 frames attributed
  to this entry's pattern; no further re-time attempts unless a future
  session sweeps the untried ~40-60 tick range with a breathe-budget
  workaround. Mechanism summary below is kept for attribution evidence;
  this is no longer an open work item.

## (mechanism record) mon-pic close animation: WIN0V catch-up jitter is real hardware
  cycle-timing, not a modelable game-state bug (root-caused, NOT fixable at
  this engine's tick/state granularity - see "why this can't be fixed" below)

**Symptom:** the mon-pic close animation (`monPic.ts` CLOSE_TABLE_B, driving
`monPicRender.ts`'s WIN0 window blend) renders the wrong pixels inside the
window (`x88-151`) for several ticks of *some* closes but not others -
confirmed independent of RENT/DESELECT (a bare `A` open then `B` close with
nothing else touched reproduces it too).

**Root cause, confirmed via direct RAM/IO-register inspection** (dev-time
recipe, `EmeraldOracle.core.memory.u16[...]`, scratch scripts not committed -
methodology below so this is reproducible):

1. `Task_CloseMonPic` (`reference/pokeemerald/src/battle_factory_screen.c:4250-4292`)
   is a completely clean, deterministic state machine: `data[5]`/`data[8]`
   (`tWinTop`/`tWinBottom`) step by exactly ±4 every single tick with **zero**
   periodicity or absolute-tick dependence - confirmed by dumping
   `gTasks[2]`'s raw `data[]` words tick-by-tick for both a clean close
   (press-tick 30) and a bad one (press-tick 36): the *internal* state is
   bit-for-bit identical between the two runs, just time-shifted by 6 ticks.
   `RunTasks`'s priority-linked-list shape (`gTasks[]` `prev`/`next`/`priority`
   fields, `reference/pokeemerald/src/task.c`) is also identical between the
   two runs, ruling out task-scheduling/insertion-order as a factor.
2. The *visible* WIN0V register is NOT the task's raw state - GBA's
   `SetGpuReg` (`reference/pokeemerald/src/gpu_regs.c:66-98`) always writes
   the new value into a shadow buffer (`sGpuRegBuffer`) immediately, but only
   copies it to the real hardware register **now** if `REG_VCOUNT` is
   currently inside vblank (161-225); otherwise it's queued
   (`sGpuRegWaitingList`) and only reaches hardware on the *next* vblank
   flush. This is a genuine, permanent 1-tick render lag, and
   `monPic.ts`'s existing `CLOSE_TABLE_B`/`CLOSE_TABLE_A` already correctly
   encode it (each table index N holds the task's internal value from tick
   N-1) - **this part was never the bug**.
3. The actual jitter: on some ticks, `Task_CloseMonPic`'s `SetGpuReg(WIN0V,
   ...)` call happens to execute *after* `REG_VCOUNT` has already crossed
   into vblank that frame (instead of before, which is the normal case),
   so the write lands on hardware immediately instead of being queued -
   collapsing the usual 1-tick lag and producing a "catch-up" (a skipped
   window-growth step, or a duplicated one on the next tick to resync).
   `REG_VCOUNT`'s value at the moment this one `SetGpuReg` call executes
   depends on the **total CPU cycle cost of everything else that ran earlier
   in the same frame** (`AnimateSprites`/`BuildOamBuffer`/`RunTextPrinters`/
   `UpdatePaletteFade`/all of `RunTasks`, per `CB2_SelectScreen`) - a
   cycle-accurate hardware race, not game *state*.

**Confirmed NOT reducible to any state this engine tracks** (the decisive
test): replaying `tools/compare/traces/rent-slot1.json`'s exact button
sequence with 0/3/7/10/17 idle frames prepended (shifting every absolute
tick but preserving every *relative* offset - ticks-since-open,
ticks-since-RENT-confirm, close-table variant, all unchanged) produces a
**different** WIN0V catch-up pattern each time. So the jitter is a function
of absolute session tick (ultimately: total emulated CPU cycles since boot,
via `RunTextPrinters`/sprite-processing/etc. cost on nearby ticks) with no
proxy available in this engine's tick-level `EngineState` - only a
cycle-accurate CPU emulation would reproduce it exactly, which is out of
scope for a tick/state-machine reimplementation.

**Ruled out along the way** (leads from the previous investigation,
superseded by the above): `monPicBg`'s tileset/palette is genuinely static
across the close (RAM-dumped, no change) - the earlier "un-modeled
shimmer/palette-cycle" suspicion was wrong. It's also not about the DOWN
press, not about `hasActed`/close-table variant (clean and broken closes use
the identical variant), and not a fixed function of ticks-since-close-started.

**Confirmed scope of the visible damage:** for `rent-slot1.json` specifically,
`npm run compare` shows `DIFF` on frames 37-47 (the window-growth phase,
up to 3343px/8.71%) tapering down through frames 49-57 (1-64px, halving
roughly in step with the post-window flash-bar's own width table) - i.e. the
same one jitter event also perturbs the flash-shrink phase that immediately
follows, since it's driven by the same task's tick sequence. Frames 58-138
(fully past the close) are unaffected and independently RAM-verified exact
(RNG stream, state machine - see PROGRESS #17).

**Why this can't be fixed at this engine's level:** a correct fix would
require modeling per-frame CPU cycle cost across unrelated subsystems
(text printer drain state, sprite count, palette fade activity) precisely
enough to predict which side of the vblank boundary `REG_VCOUNT` lands on
for one specific `SetGpuReg` call - i.e. cycle-accurate CPU emulation. That
is a different order of engineering than this codebase's tick/state-machine
architecture and is not proposed here.

**Remaining work / options for a future slice (none attempted - would each
need explicit sign-off since they lean away from "model the real mechanism"):**
- Re-time `rent-slot1.json`'s RENT-confirm press so its close lands in a
  tick range empirically confirmed clean for *that exact* trace (not a
  general rule - the shift-test above proves no general rule exists). This
  is the "dodge" option the current brief explicitly ruled out, but may be
  the only practical unblock short of cycle-accurate emulation.
- Accept `rent-slot1.json` at 125/139 permanently and document the gap
  inline (its RENT/DESELECT-specific behavior is already independently
  RAM-verified via `tests/rentSelect.test.ts`/`tests/ballAnim.test.ts`, so
  the uncovered pixels are 100% attributable to this pre-existing,
  RENT-independent close-animation jitter, not to unverified S5 logic).
