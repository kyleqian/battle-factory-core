# Noland Brain intro window — visual ground truth (gold, challenge 5)

Side-lane scout deliverable, gold sibling of
`docs/noland-brain-intro-ground-truth.md` (silver, challenge 2, merge
`a3db4cb1`). New files only — no `src/`, no `tools/compare/`. Live-verified
against `http://127.0.0.1:8014` (Battle Scene OFF) this session (2026-08-14)
with `tools/battle-lab/factory-brain-gold-intro-dense-off.json`
(`playerSetIds [564, 565, 566]`, `seed 305419896`, gold = `challengeNum 5`,
`fixedIv 31`, matching `tools/battle-lab/factory-brain-gold-turn1-off.json`).
All frame numbers below are **pre-checkpoint** numbers
(`preCheckpointCaptureFrames`, see `../oracle/BATTLE_LAB.md` "Pre-checkpoint
captures") unless marked "post-checkpoint".

## 0. Headline answer (the three questions this doc exists to settle)

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

## 1. Tick table — the compressed battle-start cutscene (frames 0–1990, gold)

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

## 2. Post-checkpoint premise check (same as silver's §0)

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

## 3. Silver-vs-gold sub-stage duration table (same-mechanism spans only)

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

## 4. Verification

`tools/probe/verify-noland-brain-intro-gold-window.ts` reruns
`tools/battle-lab/factory-brain-gold-intro-dense-off.json` live and checks
every frame/sha256 pair cited by name above, printing PASS/FAIL per check,
plus the post-checkpoint frame-0 premise check from §2. Run twice for
determinism (`node --experimental-strip-types
tools/probe/verify-noland-brain-intro-gold-window.ts`); both runs must be
byte-identical (same seed, same deterministic mGBA replay).
