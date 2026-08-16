# Noland Brain intro window — visual ground truth (gold, challenge 5)

Side-lane scout deliverable, gold sibling of
`docs/noland-brain-intro-ground-truth.md` (silver, challenge 2, merge
`a3db4cb1`). New files only — no `src/`, no `tools/compare/`.

## REFRESH (2026-08-16): everything below §0 pre-2026-08-16 is stale

Top-layer oracle commit `3e29880b` (2026-08-15) fixed gold Frontier-Brain
staging: `challengeNum 5` now sets `FLAG_SYS_FACTORY_SILVER` (0x8CC) so
`GetFrontierBrainStatus` reads READY instead of NOT_READY. Before the fix,
gold *battles* were genuinely the Brain's (`FillFactoryBrainParty` keys on
`gTrainerBattleOpponent_A == TRAINER_FRONTIER_BRAIN` regardless of overworld
flags) but gold *presentation* silently fell through to the **ordinary**
ROM trainer-intro path (`GetOpponentIntroSpeech`/`EnterRoom`'s non-Brain
branch) — a lab-staging artifact independently root-caused in
`docs/noland-walkup-dialogue-scoping.md` ("Discrepancy resolved this
session") before this fix landed. Every capture in the original §0–§4 below
(captured 2026-08-14, one day before the fix) reflects that broken
presentation. This refresh re-ran the same four committed fixtures against
the fixed oracle (`bin/oracle info` → `capabilities.battleLab.
factoryBrainWalkup: true` confirmed live) and replaces the headline/tick
data with the corrected reading. **The original §0–§4 content is preserved
verbatim, unedited, at the bottom of this file** under "Appendix: pre-fix
(stale) history" — do not delete it; it is now a case study of the bug, not
ground truth.

### 0′. Headline answer (post-fix, current)

**(a) Is the walk-up dialogue TEXT different from silver's, and how many
boxes?** The original doc's "zero Noland speech" answer was **wrong** — a
staging artifact, not real ROM behavior. Gold now shows: an escort box
("Hey, hey! Get a move on!", ~frames 690–960) with the **same wording as
silver's own escort line**, not silver's separate "Right this way, please!"
lobby box, followed immediately by **Noland's real gated first-encounter
speech** — a 4-page block (PNG-confirmed: "NOLAND: Hey, hey! How's it
going? You keeping up with your studies?" at frame ~1200) ending in a
distinct one-box line ("All right! Bring it on!", PNG-confirmed at frame
~2440, hold `f0d9bf0629eb1c8a` spans ≈2400–2528) before the transition —
matching the **4-page gold vs 8-page silver** split already source-pinned
in `factory-brain-walkup-script.json` and asserted by
`tests/factoryBrainWalkupScript.test.ts` ("pins gold's 4-page
first-encounter speech"). Gold is shorter than silver, not silent.

**(b) Are the frame numbers of transition/pic-reveal/send-out/ready shifted
vs silver, and by how much?** Yes, but far less than the stale doc claimed.
**First action-menu-ready frame: 3370** (stride-1 pinned: hold
`a6a74c388a900315` player-send-out text 3329–3363, box-closes hold
`27b3f9a751ac20cb` 3364–3369, ready-cycle sha `f35cc34332dbf907` begins
3370, PNG-confirmed "What will DUGTRIO do?" with opponent BLISSEY Lv50
shown). That is **+1481 frames vs the stale doc's claimed 1889** — entirely
attributable to the newly-revealed personality speech and the escort box's
longer hold — and only **679 frames short of silver's 4049** (not silver's
claimed 2160-frame gap). Once the personality speech is accounted for, gold
tracks silver closely rather than being a radically compressed variant.

**(c) Is anything structurally new, or is gold = silver + text substitution
+ timing shift?** The escort/transition/reveal/send-out/ready machinery is
confirmed **identical shared code** to silver and to the stale pre-fix
capture: the swirl "eye"-pause hold (`3fe5dda8d11c905c`) and the black-flash
hold (`d8b443032200e143`) are **sha-identical** to the values the stale doc
already cited for those same stages, and the pic-reveal cycle
(`c465f0`/`e7694d`/`a4c9ba`) and its wording ("FACTORY HEAD NOLAND would
like to battle!♥") are unchanged too — only their absolute frame position
moved. The one genuinely new element is the personality-speech content
itself, and even that isn't structurally new — it's the same per-box
hold/typewriter mechanism silver's own dossier already documents, just
gold's own (shorter) source-pinned script instead of an absent one.

### Reproduction params for this refresh

Same live fixtures, same params as the original capture (unchanged by the
oracle fix): `playerSetIds [564, 565, 566]`, `seed 305419896`,
`challengeNum 5`, `fixedIv 31`, opponent (Brain) party species `[242
Blissey, 26 Raichu, 126 Magmar]` (read back from `opponentParty`/
`factoryBrainWalkupScript` fixtures' own manifests this session — unchanged
by the fix, since `FillFactoryBrainParty` was never the broken half).
`tools/battle-lab/factory-brain-gold-intro-dense-off.json`'s own
`preCheckpointCaptureFrames` list (hardcoded, max 1990) **no longer reaches
the checkpoint** — the real ready frame moved to 3370, past its capture
list's end — so its committed frame list under-covers the window it was
built to document; it was not rejected (still a valid, accepted request),
just now incomplete for full-window narration. This refresh's extra
boundary frames came from ad hoc `preCheckpointCaptureFrames` probes with
the same `mode`/`challengeNum`/`seed`/`playerSetIds` (not committed as new
fixtures — this step's fixtures are the four listed in the task brief).
`tools/battle-lab/factory-brain-gold-entrance-dense-off.json`'s own
stride-1, 256-frame window (715–970) independently confirms the escort-box
dismiss boundary at frame 961 (hold `7d8066240c8e6514` through 960, unique
frames from 961) with no committed-fixture edits needed.

### 1′. Tick table (post-fix) — frames 0–3370, gold, same coordinate space

Boundary/hold shas below were confirmed via targeted probes at the stated
stride; frames not called out as stride-1 were sampled at anchors only
(same honesty convention the original doc used) — this is not a full
stride-1 re-derivation of the entire window, which was out of scope for
this session's time budget.

| Frames | Len | Content |
| --- | --- | --- |
| 0–417 | (rental-selection screen, three picks) | Not re-verified this session — precedes any Frontier-Brain-status branch, no expected change from the stale capture. |
| 418–431 | 14f hold (`d8b443032200e143`) | Black transition, rental-select → front-desk lobby — **unchanged**, sha-identical to the stale capture. |
| 432–478 | per-frame changing | Walk into lobby — not re-verified. |
| ~479–529 | ~51f hold (`5e8a533380485801`) | **Escort box 1: "Right this way, please!"** — **unchanged wording**, sha-identical to stale capture. |
| 530–628 | per-frame changing | Walking on — not re-verified. |
| 629–639 | hold (`d8b443032200e143`) | Black transition, mid-walk — **unchanged**. |
| 640–689 | per-frame changing (walking into arena) | **Unchanged region shape** — stride-1-confirmed walking, no hold, matches stale capture's characterization for this sub-span. |
| **690–960** | **271f hold (`7d8066240c8e6514`)** | **Escort box 2, NEW TEXT: "Hey, hey! Get a move on!"** (PNG-confirmed at 860) — **wording changed** from the stale capture's "Right this way, please!" repeat, now matching **silver's own escort-line wording** verbatim. Also **starts ~170 frames earlier and holds ~3.3× longer** than the stale capture's box-2 (690–960 vs stale's 880–962). Stride-1-confirmed via the committed `factory-brain-gold-entrance-dense-off.json` fixture (256 frames, 715–970, hold through 960 with no interior change). |
| 961 | dismiss frame | Escort box 2 closes — stride-1-confirmed (committed entrance-dense fixture) begin of unique-frame typewriter into the next box, no intervening hold. |
| **962–~2439** | **~1478f, NEW CONTENT, per-box holds + unique-frame typewriter spans** | **Noland's real first-encounter personality speech** (previously believed absent). PNG-confirmed page: "NOLAND: Hey, hey! How's it going? You keeping up with your studies?" (~frame 1200). Gated 4-page block per `tests/factoryBrainWalkupScript.test.ts` ("pins gold's 4-page first-encounter speech"), ending in a separate box, "All right! Bring it on!" (matches the source-derived line 10′ predicted in `docs/noland-walkup-dialogue-scoping.md`). |
| ~2400–2528 | hold (`f0d9bf0629eb1c8a`) | Final speech box, "All right! Bring it on!", settled — **PNG-verified** at 2440. |
| 2531–~2557 | ≥27f hold (`31aec4d68fe629cb`) | Dialogue box dismissed, brief pause — **sha-identical** to the stale capture's own "963–989" hold; same shared, content-independent engine state, now relocated after the personality speech instead of after escort box 2. |
| ~2558–~2687 | flicker, 8-phase cycle | Pre-transition screen flash — **same sha set** as the stale capture's flicker (e.g. `1173fa84…`). |
| ~2688–~2721 | hold (`3fe5dda8d11c905c`) | Swirl "eye" pause — **sha-identical** to the stale capture's own swirl-pause hold; confirms shared, deterministic transition art independent of dialogue content/length. |
| ~2722–~2739 | unique, expanding | Swirl expanding into black — not individually reconfirmed this session, presumed present (structurally identical). |
| ~2740–~2783 | hold (`d8b443032200e143`) | Full black flash — **sha-identical** to the stale capture's black-flash hold (and to the earlier rental/lobby black-transition holds — same shared solid-black framebuffer, per both docs' own caveat). |
| ~2784–2987 | unique every frame | Battle scene fades in, both send-out pics slide in — content class unchanged from stale capture, absolute position shifted. |
| **2988–~3071** | ~84f, cycling `c465f0`/`e7694d`/`a4c9ba` | **Trainer pic reveal + name/class text**, settled — **PNG-verified** at 3040: "FACTORY HEAD NOLAND would like to battle!♥" — **wording and cycle-member shas unchanged** from stale capture, only shifted later. |
| 3072–~3328 | unique every frame | Opponent transition-out + opponent entrance anim + player entrance anim — **a distinct opponent-send-out text hold was not resolved at sub-stage precision this session** (3-frame-stride sampling through 3260–3326 showed continuously unique content); flagged as open follow-up, not fabricated. |
| 3329–3363 | 35f hold (`a6a74c388a900315`) | Player send-out text window, settled (not independently PNG-checked this session, but structurally consistent with the stale capture's player-send-out-hold class). |
| 3364–3369 | 6f hold (`27b3f9a751ac20cb`) | Box closes into the action menu. |
| **3370+** | cycling `f35cc34332dbf907`/`d9b011b58355cc1d`/`0704ebb0ea65b364`/`257ccd4c4797d6dc`, 4-phase, ≈33f period (stride-1 confirmed 3390–3423) | **First action-menu-ready frame: 3370.** PNG-verified: "What will DUGTRIO do? ▶FIGHT BAG / POKéMON RUN", opponent BLISSEY Lv50 shown. |

**Headline: 3370 frames pre-checkpoint to the first action-menu-ready
frame** (vs the stale doc's claimed 1889, vs silver's 4049) — a
**+1481-frame correction**, all of it the newly-revealed personality speech
plus the escort box's longer hold.

### 2′. Post-checkpoint premise check (post-fix)

Post-checkpoint frame 0's sha (`f35cc34332dbf907`, confirmed via both
`factory-brain-gold-intro-dense-off.json` and
`factory-brain-gold-turn1-off.json`'s own live re-runs this session) matches
the pre-checkpoint ready-cycle sha at frames 3390/3423 exactly — same
premise as the stale doc's own §2: the entire gold battle-start window has
already happened inside the lab's internal `prepare()` route by the time
the caller's own post-checkpoint trace begins. Both `gold-turn1` and
`gold-entrance-dense`'s **post-checkpoint traces needed no edits** — they
are relative to the checkpoint, not to a hardcoded frame count, so the
lab's own relocated ready state is transparent to them; only the
`gold-intro-dense` fixture's own `preCheckpointCaptureFrames` list (a fixed
array baked into the committed file) now under-covers the window, per the
reproduction-params note above.

### 3′. Silver-vs-gold sub-stage duration table (post-fix)

| Stage | Silver (challenge 2) | Gold (challenge 5, post-fix) | Duration match? |
| --- | --- | --- | --- |
| Escort/personality speech block (all boxes, front-desk through last box) | ~700–3210 (~2510f, 8-page speech) | ~690–2528 (~1838f, 4-page speech) | Different — gold's real speech is shorter, not absent |
| Dialogue-dismissed pause | 3201–3228 (28f) | 2531–~2557 (≥27f) | Same (±1f), **sha-identical** |
| Pre-transition flicker | 3229–3279 (51f) | ~2558–~2687 (~130f, not stride-1 pinned) | Not directly comparable at this session's precision |
| Swirl "eye" pause hold | 3334–3367 (34f) | ~2688–~2721 (~34f) | **Same duration, sha-identical** |
| Full black flash hold | 3379–3422 (44f) | ~2740–~2783 (~44f) | **Same duration, sha-identical** |
| Pic reveal + name/class text hold | 3640–3738 (99f) | 2988–~3071 (~84f) | Roughly comparable, not stride-1 pinned this session |
| Player send-out text hold | 4003–4042 (40f) | 3329–3363 (35f) | Roughly comparable |
| Box closes into action menu | 4043–4048 (6f) | 3364–3369 (6f) | **Same duration** |
| Ready-cycle period | 36f, 4-phase | ≈33f, 4-phase | Roughly comparable |
| **First ready frame** | **4049** | **3370** | **679f shorter** (was reported as 2160f shorter under the stale capture) |

The swirl-pause and black-flash holds are **sha-identical** to the stale
capture's own values for those stages — direct proof this shared transition
art was never actually affected by the bug; only the content *before* it
(the walk-up dialogue) was wrong.

### 4′. App divergence measurement (this session, oracle post-fix)

`npm run compare -- factory-round-battle7-noland-gold-reveal-off.json
--summary` now reports **0/701 frames matched** (was 700/701 against the
stale oracle — see `PROGRESS-archive.md`). Frame 0 already mismatches at
88.90% diff (34137px, bbox 1,0-238,159, ssimMean 0.0934) and stays wrong
through frame 700 (final frame: 96.74% diff, 37147px). Root cause: the
compare trace (`tools/compare/traces/factory-round-battle7-noland-gold-
reveal-off.json`) pins `oracleBattleLab.preCheckpointFrameOffset: 1151` — a
frame number calibrated against the **stale** timeline, where 1151 sat
inside the black-flash hold just before the pic-reveal fade-in (see the
Appendix's §1 row `1150–1193`). Post-fix, that same absolute oracle frame
1151 now falls **inside Noland's newly-revealed personality speech**
(within the ~962–2439 span above) — a completely different scene. The
app's own stage (`generatedRoundBattle7NolandGoldRevealStage` →
`generatedGoldRoundRevealProofStage` →
`beginFactoryRoundBattleStartIntro`/`battleIntroSceneAssemblyDisplayLag` in
`tools/compare/factoryRoundIntroGeneralizationStage.ts`) starts its own
presentation directly at the transition/reveal, matching what the *stale*
oracle showed — so app-frame-0 (transition/reveal content) is now being
diffed against oracle-frame-1151 (mid-personality-speech content), and
every one of the 701 frames in the window mismatches because the two sides
are depicting entirely different scenes, not a small pixel-level drift.
This is **not** a regression to fix in this step — it is the expected,
honest consequence of the oracle now telling the truth; the fix belongs to
whichever later step implements gold's real walk-up presentation (recalibrating
`preCheckpointFrameOffset` alone would not be enough — the app doesn't
render the personality-speech scene at all yet).

### 5′. What the gold walk-up program will need (confirmed by these captures)

- **A real, rendered personality-speech scene for gold**, source-pinned as
  4 pages (`factory-brain-walkup-script.json`,
  `tests/factoryBrainWalkupScript.test.ts`) — distinct from silver's 8-page
  speech, not a no-op. The app currently has no presentation stage for it
  (`beginFactoryRoundBattleStartIntro` jumps straight past it).
- **Escort box 2's text is Brain-specific**, not the generic ordinary-
  trainer "Right this way, please!" — it reads "Hey, hey! Get a move on!",
  identical wording to silver's. Escort box 1 (front-desk lobby, "Right
  this way, please!") is unaffected — the divergence is isolated to the
  arena-entrance box.
- **Timing is data, not hardcoded**: the compare harness's
  `preCheckpointFrameOffset: 1151` constant is now provably wrong and will
  need to move once real speech rendering lands (approximately +1481f,
  though the precise post-speech offset should be re-derived from a real
  implementation, not backed into this constant blind).
- **No new engine mechanism is needed** — every downstream stage
  (transition swirl, black flash, pic reveal, both send-outs, ready loop)
  is confirmed byte-identical shared code to both silver and the stale
  gold capture; this is purely a content/timing gap in the walk-up
  dialogue portion, the same mechanism silver's dossier already documents.
- **Open follow-up, not resolved this session**: the opponent-send-out
  text hold's precise boundary (between ~3072 and 3328) was not pinned to
  sub-stage precision — a future step doing exact-frame work on this
  window should re-probe that range at stride 1.

## Appendix: pre-fix (stale, oracle bug: missing gold Frontier-Brain symbol flag) history — captured 2026-08-14

Everything below this line is the **original, unedited** capture from one
day before the `3e29880b` fix landed. It is preserved for forensic/history
purposes and as a case study of the staging bug — **do not treat any
frame number, sha, or wording claim below as current ground truth**; see
the refresh above for the corrected reading. Original framing note (now
inaccurate, kept verbatim): "Live-verified against `http://127.0.0.1:8014`
(Battle Scene OFF) this session (2026-08-14) with
`tools/battle-lab/factory-brain-gold-intro-dense-off.json` (`playerSetIds
[564, 565, 566]`, `seed 305419896`, gold = `challengeNum 5`, `fixedIv 31`,
matching `tools/battle-lab/factory-brain-gold-turn1-off.json`). All frame
numbers below are **pre-checkpoint** numbers (`preCheckpointCaptureFrames`,
see `../oracle/BATTLE_LAB.md` "Pre-checkpoint captures") unless marked
"post-checkpoint".

### 0. Headline answer (the three questions this doc exists to settle)

**(a) Is the walk-up dialogue TEXT different from silver's, and how many
boxes?** Yes, radically. Silver's window contains **Noland's own ~12-box
personality speech** ("Hey, my name's NOLAND!...", frames ~700–3210). Gold's
window contains **zero** Noland speech before the transition — instead there
are **two short usher/escort boxes reading the same line, "Right this way,
please!"** (§2, frames ~479–529 and ~860–962), spoken by the attendant
walking the player from the front desk into the arena, not by Noland at all.
Noland's own "would like to battle!" line does not appear until the
pic-reveal window (§2), identical in wording to silver's.

**(b) Are the frame numbers of transition/pic-reveal/send-out/ready shifted
vs silver, and by how much?** Yes, hugely — the whole window is compressed
because the long personality speech is simply absent. Ready frame: **1889**
(vs silver's 4049, a shift of −2160 frames). But the shift is *not* uniform:
several individual cutscene sub-stage **durations are frame-identical** to
silver even though their absolute position moved (§3 table) — most notably
the fade-in/send-out-pic-slide-in stage is **217 frames in both** cases,
exactly. Others differ in duration, not just position (pic-reveal hold is
134f in gold vs 99f in silver; opponent send-out text hold is 72f vs 31f).

**(c) Is anything structurally new, or is gold = silver + text substitution
+ timing shift?** Mostly the latter, **with one structural addition**: gold
has an escort/walk-in phase (front desk → arena, ~frames 418–962, including
a mid-walk room-transition black fade at ~629–639) carrying the "Right this
way, please!" line, entirely separate from — and in place of — silver's long
walk-up personality dialogue. This escort phase is very likely present in
silver too (silver's own frame-700 anchor, "Hey, hey! Get a move on!", reads
as the same usher-hurry-you-along archetype, not Noland's own voice) — so
this is *not* a new window class, just one silver's dossier didn't isolate
because its coarse ≥20-stride sampling never resolved the escort walk from
Noland's own dialogue. From the escort's end onward (dismiss → flicker →
swirl → eye-pause → black-flash → fade-in → pic-reveal → opponent send-out →
player send-out → ready), gold exercises **exactly the same stage sequence**
as silver, same shared transition art (identical shas for the eye-pause and
black-flash holds), no new stage.

### 1. Tick table — the compressed battle-start cutscene (frames 0–1990, gold)

Boundary frames are stride-1 exact (every span end is a directly-observed
sha change, not an interpolation) for the **load-bearing sub-windows**
(dismiss → ready, frames 963–1990); the rental-select and escort-walk region
(frames 0–962) is sampled at the same coarseness silver used for its
walk-up dialogue (anchors + a few dense checks around each hold), flagged
per-row below.

| Frames | Len | Content (label-bearing rows PNG-verified) |
| --- | --- | --- |
| 0 | (rental-selection screen) "RENTAL POKéMON — Select the first POKéMON." (Ductrio, Medicham, Misdreavus shown as this run's rental options) — **PNG-verified**. |
| 3–7, 8–69 | two short black holds (`d8b44303`) | Pre-rental-screen fade-in; occurs before any Pokémon pick, shared black-frame sha with the later transition art (coincidental — a solid-black framebuffer hashes the same regardless of context, per silver's own §2 caveat). |
| ~70–417 | per-frame changing, not stride-1 verified | Three rental picks ("select first/second/third POKéMON", RENT confirmation) — **PNG-verified** at 100 ("select first"), 200 ("select second"), 300 ("select third", RENT/SUMMARY/OTHERS menu open). Not part of the battle-start window proper (same pre-battle setup silver's frame-0 anchor also sits in). |
| 418–431 | 14f hold (`d8b44303`) | Black transition, rental-select screen → front-desk lobby. |
| 432–478 | per-frame changing, not stride-1 verified | Player walks into the front-desk/shop lobby (guard NPCs, item shelves) — **PNG-verified** at 460 (lobby interior, no text box yet). |
| **479–529** | ~51f hold (`5e8a5333`) | **Escort box, instance 1: "Right this way, please!"** — **PNG-verified** at 500 (player in lobby, text box present). Not stride-1 verified at both edges (anchors only). |
| 530–628 | per-frame changing (walking), not stride-1 verified | Player walks on, box dismissed, no text box — **PNG-verified** at 530, 610 (no box). |
| ~629–639 | ~11f hold (`d8b44303`) | Second black transition, mid-walk (shop/corridor → arena room) — **PNG-verified** at 630 (solid black). Same shared sha as the other black holds. |
| 640–859 | per-frame changing (walking into arena), not stride-1 verified | Player walks across the arena floor toward the battle position — **PNG-verified** at 650, 800, 830 (arena hex floor, ring of spectator NPCs, no text box). |
| 860 | 1f (fade-in of box) | Text box begins appearing — **PNG-verified** (box art visible, still animating in). |
| **880–962** | 83f hold (`5c99a4d66e`) | **Escort box, instance 2: "Right this way, please!"**, fully settled — **PNG-verified** at 915 (player now centered in the arena, same line repeated as a checkpoint). |
| 963–989 | 27f hold (`31aec4d6`) | Dialogue box dismissed; empty arena view, brief pause. Same sha as silver's own post-dialogue-dismiss hold. |
| 990–1040 | 51f, low-period flicker (`ce3e94`/`9ea9d9` alternating at this fixture's sample spacing; full 8-phase cycle `ce3e94`/`1173fa`/`0c9105`/`b27ee1`/`322a51`/`ed2e01`/`9ea9d9`/`ec073b`, period 16f, confirmed stride-1) | Pre-transition screen flash/shake — **identical shas to silver's own flicker set**, same shared art. |
| 1041–1104 | 64f, unique every frame | Battle-transition swirl animation (shrinking iris). |
| 1105–1138 | 34f hold (`3fe5dda8`) | Swirl fully converged, held ("eye" pause) — **PNG-verified** at 1120 (converging-circle transition art); **identical sha and identical 34-frame duration to silver**. |
| 1139–1149 | 11f, unique every frame | Swirl continuing / expanding into black — **identical 11-frame duration to silver**. |
| 1150–1193 | 44f hold (`d8b44303`) | Full black flash — **PNG-verified** at 1170 (pure black); **identical sha and identical 44-frame duration to silver**. |
| 1194–1410 | 217f, unique every frame (no holds) | Battle scene fades in; both trainers' send-out pics slide/bounce in while "FACTORY HEAD NOLAND would like to battle!" typewriters in — **identical 217-frame duration to silver's own fade-in span**. |
| **1411–1544** | 134f, cycling `c465f0`/`e7694d`/`a4c9ba`, period 27f (9f each) | **Trainer pic reveal + name/class text window**, fully settled — **PNG-verified** at 1480: player's ball indicators (top-left), Noland's trainer sprite (top-right), text "FACTORY HEAD NOLAND would like to battle!♥" — **wording and start/end shas identical to silver**, but the hold itself is 35 frames longer (134f vs silver's 99f). |
| 1545–1643 | 99f, unique every frame | Trainer-vs-trainer transition out + opponent send-out entrance animation (Blaziken jumping in) + "sent out BLAZIKEN!" text typing in — comparable to silver's combined 100f for the same two stages. |
| **1644–1715** | 72f hold (`9503cf76`) | **Opponent send-out text window, settled** — **PNG-verified** at 1680: "BLAZIKEN Lv50" HP bar, "FACTORY HEAD NOLAND sent out BLAZIKEN!" — **different opponent species from silver's Azumarill** (Frontier Brain's lead varies by challenge/roll); hold is more than double silver's 31f. |
| 1716–1847 | 132f, unique every frame | Opponent send-out box closes; player's Pokéball throws in; Dugtrio entrance animation + "Go! DUGTRIO!" text typing in — comparable to silver's combined 133f for the same two stages. |
| **1848–1882** | 35f hold (`b2bd1f35`) | **Player send-out text window, settled** — **PNG-verified** at 1870 (both mons shown, "Go! DUGTRIO!") — **different rental Pokémon from silver's Delcatty** (`playerSetIds` differ by design). |
| 1883–1888 | 6f, unique every frame | "Go! DUGTRIO!" box closes into the action menu — **identical 6-frame duration to silver**. |
| **1889–1990(+)** | cycling `995c66ff`(9f)/`6bfde72b`(9f)/`08a32dfc`(9f)/`d8275aa2`(9f), period 36f, with two reproducible single-frame "settling" blips at 1892-ish and 1956 before/within the loop | **First action-menu-ready frame: 1889.** **PNG-verified** at 1900 and 1950 (both show "What will DUGTRIO do? ▶FIGHT BAG / POKéMON RUN", identical menu text) — **identical 4-phase/36-frame cycle structure to silver**, just different literal shas (different Pokémon on screen). |

**Headline: 1889 frames pre-checkpoint to the first action-menu-ready
frame** (vs silver's 4049) — a **2160-frame reduction**, entirely from the
absent Noland personality monologue. The visually load-bearing span
963→1889 (dismiss → ready, 926 frames) is close in length to silver's
equivalent 3201→4049 span (848 frames) — the cutscene machinery itself
(transition, reveal, both send-outs, ready) is not meaningfully shorter in
gold, only shifted; only the walk-up content in front of it shrank
drastically.

### 2. Post-checkpoint premise check (same as silver's §0)

Post-checkpoint frame 0's sha (`995c66ff0a4578418a8c6ecc387c06a966a55fd`,
full hash in the fixture's live response) matches the pre-checkpoint
ready-cycle sha above exactly (frames 1889, 1893, 1900, 1929, 1974) —
confirming, same as silver, that the entire gold battle-start window
(escort walk, transition, pic reveal, both send-outs, ready bounce) has
**already happened inside the lab's internal `prepare()` route** by the time
the caller's own post-checkpoint trace begins at frame 0. Nothing in this
step required editing `factory-brain-gold-turn1-off.json`; its post-checkpoint
trace (2 A / 30 wait / 2 A / 700 wait) opens/confirms the FIGHT menu for
turn 1, same as silver's.

### 3. Silver-vs-gold sub-stage duration table (same-mechanism spans only)

| Stage | Silver (challenge 2) | Gold (challenge 5) | Duration match? |
| --- | --- | --- | --- |
| Dialogue-dismissed pause | 3201–3228 (28f) | 963–989 (27f) | Same (±1f) |
| Pre-transition flicker | 3229–3279 (51f) | 990–1040 (51f) | **Identical** |
| Transition swirl (unique frames) | 3280–3333 (54f) | 1041–1104 (64f) | Different (+10f) |
| Swirl "eye" pause hold | 3334–3367 (34f) | 1105–1138 (34f) | **Identical** |
| Swirl expanding into black | 3368–3378 (11f) | 1139–1149 (11f) | **Identical** |
| Full black flash hold | 3379–3422 (44f) | 1150–1193 (44f) | **Identical**, identical sha too |
| Fade-in / send-out-pic slide-in | 3423–3639 (217f) | 1194–1410 (217f) | **Identical** |
| Pic reveal + name/class text hold | 3640–3738 (99f) | 1411–1544 (134f) | Different (+35f) |
| Transition-out + opponent entrance anim | 3739–3838 (100f combined) | 1545–1643 (99f) | Same (±1f) |
| Opponent send-out text hold | 3839–3869 (31f) | 1644–1715 (72f) | Different (+41f) |
| Sendout-closes + player entrance anim | 3870–4002 (133f combined) | 1716–1847 (132f) | Same (±1f) |
| Player send-out text hold | 4003–4042 (40f) | 1848–1882 (35f) | Different (−5f) |
| Box closes into action menu | 4043–4048 (6f) | 1883–1888 (6f) | **Identical** |
| Ready-cycle period | 36f, 4-phase | 36f, 4-phase | **Identical structure** |

Six of fourteen comparable spans are frame-identical, including the two
longest (the 217-frame fade-in and the 44-frame black flash, both also
sha-identical) — strong evidence this is genuinely shared, timed animation
code, not something that varies with dialogue length or species. The spans
that *do* differ (swirl length, pic-reveal hold, opponent send-out hold,
player send-out hold) are plausibly typewriter-text-length-dependent
("FACTORY HEAD NOLAND sent out BLAZIKEN!" vs "...AZUMARILL!", etc.), but
this doc does not claim that causal link as proven — only the measured
durations, which is what the pixel-closure step needs.

### 4. Verification

`tools/probe/verify-noland-brain-intro-gold-window.ts` reruns
`tools/battle-lab/factory-brain-gold-intro-dense-off.json` live and checks
every frame/sha256 pair cited by name above, printing PASS/FAIL per check,
plus the post-checkpoint frame-0 premise check from §2. Run twice for
determinism (`node --experimental-strip-types
tools/probe/verify-noland-brain-intro-gold-window.ts`); both runs must be
byte-identical (same seed, same deterministic mGBA replay).
