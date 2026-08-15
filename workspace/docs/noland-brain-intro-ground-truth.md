# Noland Brain intro window — visual ground truth (silver, challenge 2)

Side-lane scout deliverable per this session's step brief. Ground truth only
— no `src/`, no `tools/compare/`, no app-side work. Live-verified against
`http://127.0.0.1:8014` (Battle Scene OFF) this session (2026-08-14) with
`tools/battle-lab/factory-brain-silver-intro-dense-off.json`
(`playerSetIds [267, 268, 269]`, `seed 305419896`, silver = `challengeNum 2`,
`fixedIv 15`). All frame numbers below are **pre-checkpoint** numbers (the
separate, absolute `preCheckpointCaptureFrames` coordinate space —
`../oracle/BATTLE_LAB.md` "Pre-checkpoint captures") unless marked
"post-checkpoint". `bin/oracle lab` writes these as
`pre-checkpoint-frame-NNNNN.png` / `frame-NNNNN.png`.

## 0. Premise correction — the interesting window is *pre*-checkpoint, not post

The step brief frames the target as "the window from the lab checkpoint
through the first action-menu-ready frame," implying that window sits after
`frame 0` of the post-checkpoint `trace`. That premise does not survive
contact with the contract: `BATTLE_LAB.md` states frame zero of the
post-checkpoint trace is *already* "the first player action menu after
source initialization, **including any species- or ability-dependent
entrance messages**." Empirically, post-checkpoint frame 0's sha256
(`740918853e7e2eba…`, full hash in the fixture's live response) is the same
sha that recurs cyclically in the pre-checkpoint stream from frame ~4049
onward (§2 below) — i.e. by the time the caller's own trace begins, the
walk-up dialogue, battle transition, trainer-pic reveal, name/class text,
and both send-outs have **already happened and already been
auto-acknowledged**, entirely inside the lab's internal `prepare()` route.
Nothing in the checked-in `factory-brain-silver-turn1-off.json`'s
post-checkpoint segments (2 frames A, 30 wait, 2 frames A, 700 wait) shows
any of this content — those presses open/confirm the FIGHT menu to play out
turn 1, not to dismiss battle-start dialogue.

So: **the entire Brain battle-start window this step was asked to bank
lives in `preCheckpointCaptureFrames` space, not in the post-checkpoint
trace.** This is a genuine premise correction, not a scope expansion — the
dense fixture below captures exactly this pre-checkpoint region, per
`BATTLE_LAB.md`'s own guidance to "read the contract to pick the honest
[capture mechanism] for where this window actually sits relative to the
checkpoint."

This also answers step-brief item 1's "if any survive past the checkpoint"
question directly: **no**, none of it survives past the checkpoint. The
post-checkpoint frame 0 the ordinary `factory-brain-silver-turn1-off.json`
fixture already captures is the fully-settled action menu.

## 1. Where the extra acks go (12 → 16)

PROGRESS 1256 measured the Brain intro needing 16 internal A-press
acknowledgement chunks against the ordinary ceiling of 12. §3's
ordinary-comparator run (`factory-trainer-pic-shizuka-off.json`, an
ordinary trainer at the same challenge index) shows the mechanism directly:
Noland's walk-up dialogue is **one long multi-box personality speech**
(this run: 12 separate text boxes, frames ~700–3210, ~2500 frames / ~42s),
each box requiring its own auto-ack chunk, versus the ordinary trainer's
**one line** ("SHOW ME THAT YOU'RE SERIOUS!", a single box around frame
900). The battle-transition-onward machinery (swirl, black flash, pic
reveal, send-outs, ready state) is otherwise structurally identical between
the two (§3) and does not itself need extra acks beyond the one-box-per-ack
pattern already visible in the ordinary case. The extra ack budget is
almost entirely walk-up-dialogue volume, not new cutscene mechanics.

## 2. Tick table — the battle-start cutscene (frames 3200–4096, silver)

This region is **stride-1 verified in full** (three live sub-window scans
covering every single frame 3200–4096, not just the dense fixture's
boundary markers) — every span below is a genuine hold or a genuine
per-frame-changing run, not an aliasing artifact. Where a "hold" is actually
a low-period cursor/prompt bounce cycling between 2–4 distinct framebuffers
with the same textual content, it is written as a cycle, matching this
codebase's standing idle-bounce warning (`AGENTS.md`/step brief) — a flat
single-sha span below really is flat for its full stated length.

| Frames | Len | Content (label-bearing rows PNG-verified) |
| --- | --- | --- |
| 3140–3200 | 61f hold (`81d5fc9c`) | Tail of walk-up dialogue, last box: "Shake out every last bit of your knowledge and bring it on!" — **PNG-verified** at 3140. |
| 3201–3228 | 28f hold (`31aec4d6`) | Dialogue box dismissed; empty arena view, brief pause. |
| 3229–3279 | per-frame, low-period flicker (cycles `ce3e94`/`1173fa`/`0c9105`/`b27ee1`/`322a51`/`ed2e01`/`9ea9d9`/`ec073b`, period 16f, briefly returning to `31aec4d6` at 3244/3260/3276) | Pre-transition screen flash/shake. |
| 3280–3333 | 54f, unique every frame | Battle-transition swirl animation (shrinking iris). |
| 3334–3367 | 34f hold (`3fe5dda8`) | Swirl fully converged, held ("eye" pause) — **PNG-verified** at 3340 (blue/white converging-circle transition art). |
| 3368–3378 | 11f, unique every frame | Swirl continuing / expanding into black. |
| 3379–3422 | 44f hold (`d8b44303`) | Full black flash — **PNG-verified** at 3390 (pure black frame; the dense fixture cites the same held span via frame 3400, same sha). Coincidentally the same sha as pre-checkpoint frame 20 (an unrelated earlier black frame from the rental-select flow); a real sha collision between two unrelated solid-black framebuffers, not a state re-entry. |
| 3423–3639 | 217f, unique every frame (no holds) | Battle scene fades in; both trainers' send-out pics slide/bounce in while "FACTORY HEAD NOLAND would like to battle!" typewriters in. |
| 3640–3738 | 99f, cycling `c465f0`/`e7694d`/`a4c9ba`, period 27f (9f each) | **Trainer pic reveal + name/class text window**, fully settled — **PNG-verified** at 3660: player's ball indicators (top-left), Noland's trainer sprite (top-right), text "FACTORY HEAD NOLAND would like to battle!♥". The 3-phase cycle is decorative background shimmer, not text changing. |
| 3739–3809 | 71f, unique every frame | Trainer-vs-trainer screen transitions out. |
| 3810–3838 | 29f, unique every frame | Opponent send-out entrance animation (Azumarill jumping in) + "sent out AZUMARILL!" text typing in. |
| 3839–3869 | 31f hold (`9b7a93bd`) — **stride-1 flat, no bounce detected in this particular span** | **Opponent send-out text window, settled** — **PNG-verified** at 3850: "AZUMARILL Lv50" HP bar, "FACTORY HEAD NOLAND sent out AZUMARILL!". |
| 3870–3999 | 130f, unique every frame (one micro-hold: 3882–3884, 3f) | Opponent send-out box closes; player's Pokéball throws in; Delcatty entrance animation + "Go! DELCATTY!" text typing in. |
| 4000–4002 | 3f, unique every frame | Tail of the "Go! DELCATTY!" typewriter. |
| 4003–4042 | 40f hold (`6f265edb`) | **Player send-out text window, settled** — **PNG-verified** at 4000 (already inside the print-finished region by sampling coincidence): both mons shown, "Go! DELCATTY!". |
| 4043–4048 | 6f, unique every frame (`06bbba21`) | "Go! DELCATTY!" box closes into the action menu. |
| 4049–4096(+) | cycling `740918`(9f)/`c19bfb`(9f)/`73764b`(9f)/`5dfd63`(9f), period 36f | **First action-menu-ready frame: 4049.** **PNG-verified** at 4052 and 4068 (both show "What will DELCATTY do? ▶FIGHT BAG / POKéMON RUN" — identical menu text; the 4-phase cycle is the FIGHT-cursor blink). `preCheckpointCaptureFrames` is capped at 4096 (validated: `4097` is rejected), so the internal route's true end past 4096 is not directly observable — but its sha (`740918…`) is the *same* sha as post-checkpoint frame 0, and both fall in-phase in this same 36-frame cycle, which is strong (not conclusive, given cycle aliasing) evidence the checkpoint lands inside this same steady-state ready loop just past frame 4096. |

**Headline: 4049 frames pre-checkpoint (from the lab's internal anchor) to
the first action-menu-ready frame; the visually load-bearing content is the
849-frame span 3200→4049** (walk-up-dialogue tail → transition → pic reveal
→ both send-outs → ready). Pic reveal + name/class text: **3640–3738**.
Opponent send-out text: **3839–3869**. Player send-out text: **4003–4042**.
First ready frame: **4049**.

## 3. Walk-up dialogue window (frames 0–3210) — coarse map, spot-verified

This region was sampled at stride ≥20 (not stride-1 throughout) except for
one representative sub-window verified stride-1 (2860–2984, see below) —
**flag accordingly**: the per-box "holds" listed here are anchor frames
with a PNG-confirmed label, not stride-1-proven flat spans. The one
stride-1 check performed (frames 2860–2984) found the *same* low-period
cursor-bounce pattern as §2's transition/reveal/ready windows (3-phase
cycle, 9-frame period, same textual content throughout) rather than a flat
hold — so the same caveat almost certainly applies to the other dialogue
boxes below; they were not individually re-verified for time.

| Anchor frame | Text (PNG-verified) |
| --- | --- |
| 0 | (rental-selection screen, not dialogue) "RENTAL POKéMON — Select the first POKéMON." |
| 700 | "Hey, hey! Get a move on!" |
| 1180 | "Hey, my name's NOLAND! I'm basically in charge of this place!" |
| 2000 | "...which is why I'm the FACTORY HEAD!♥" |
| 2140 | "I had a look..." |
| 2350 | "You seem to have the right idea, but you're still square in your head!♥" |
| 2500 | "Listen up, okay? Knowledge isn't only about reading books or doing desk work." |
| 2650 | "Just doing that sort of thing... It may as well be useless!♥" |
| 2860 | "I'll take you on under the same conditions as you.♥" (stride-1 confirmed hold region 2860–2932, then unique-frame text-advance 2933–2965, then hold 2966–2984 into the next box) |
| 2980 | "I'll be using rental POKéMON, too!" |
| 3140 | "Shake out every last bit of your knowledge and bring it on!" |

Twelve text boxes total (0 is the rental screen, not dialogue; 700 through
3140 are the 12 counted in §1 — actually 10 distinct anchor samples shown
above at this stride, consistent with "roughly a dozen boxes" — exact box
count was not separately re-derived from a full stride-1 pass, since §1's
`(12 ordinary : 16 Brain)` ack-chunk delta is the load-bearing number this
step needed, and it is already independently confirmed by PROGRESS 1256's
live measurement).

## 4. Ordinary-vs-Brain delta

Comparator: `tools/battle-lab/factory-trainer-pic-shizuka-off.json`
(`factoryLegal`, `challengeNum 2`, `trainerId 110`, an ordinary ranked
trainer at the *same* challenge index as the silver Brain battle — the
closest apples-to-apples comparator available, since it holds `challengeNum`
constant and only varies trainer identity). Read (not assumed) via the same
`preCheckpointCaptureFrames` mechanism this session.

| Aspect | Ordinary (Shizuka, trainerId 110) | Brain (Noland, silver) | Structurally same? |
| --- | --- | --- | --- |
| Walk-up dialogue | 1 box ("SHOW ME THAT YOU'RE SERIOUS!", ~frame 900) | ~10-12 boxes, frames ~700–3210 | **Different** — this is the entire size delta (§1). |
| Battle-transition black flash | Frame ~1160–1180 (`d8b44303`, same sha as the Brain case's own black flash — the transition art is shared/identical) | Frame 3379–3422 | **Same mechanism**, shifted later by dialogue length. |
| Trainer pic + name/class text | Present, same shape (pic + "[CLASS] [NAME] would like to battle!") | Present: "FACTORY HEAD NOLAND would like to battle!" | **Same mechanism**; text differs only in the class/name string per design §2.3 (`TRAINER_CLASS_FACTORY_HEAD` / `"NOLAND"` vs the ordinary trainer's own class/name). |
| Opponent send-out text | Present, same shape | Present: "FACTORY HEAD NOLAND sent out AZUMARILL!" | **Same mechanism**; "FACTORY HEAD NOLAND" replaces the ordinary trainer's class+name in the sent-out line too. |
| Player send-out text | Present ("Go! KADABRA!" in this comparator's case) | Present ("Go! DELCATTY!") | **Identical mechanism**, player-side text is trainer-independent either way. |
| Ready-state cursor bounce | Present at the end (verified: ordinary run's post-checkpoint frame0 sha already matches its own pre-checkpoint frame ~2000) | Present (§2, 4049+, 36f cycle) | **Same mechanism.** |
| Total pre-checkpoint route length (this challengeNum) | ~2000 frames (post-checkpoint frame 0 sha == pre-checkpoint frame 2000 sha) | ~4049+ frames | **Different** — driven almost entirely by dialogue volume (§1), not by any extra cutscene stage. |

**What the app implementation should take from this:** the Brain intro is
*not* a structurally distinct cutscene — every stage an ordinary trainer's
intro has (transition, pic reveal, name/class text, opponent send-out,
player send-out, ready bounce) Noland's intro has too, unchanged in
mechanism. The only real content difference is (a) the much longer walk-up
personality dialogue before the transition even starts, entirely an
overworld/pre-battle-scene concern outside the `mechanicLab`/battle-start
surface `factoryTrainerPresentation.ts` covers, and (b) the class/name
string substitution ("FACTORY HEAD" / "NOLAND") design §2.3 already
documents and PROGRESS 1257 already identified as the blocking rung-4 gap
(`getFactoryTrainerPresentation` has no `TRAINER_FRONTIER_BRAIN` entry).
No new visual stage, no new frame-timing contract, is needed on the app
side beyond that presentation-table entry — this ground truth does not
surface any further app-side gap.

## 5. Verification

`tools/probe/verify-noland-brain-intro-window.ts` reruns
`tools/battle-lab/factory-brain-silver-intro-dense-off.json` live and
checks every frame/sha256 pair cited by name above (the §2 table's span
boundaries plus the §3/§4 anchor frames), printing PASS/FAIL per check.
Run twice for determinism (`node --experimental-strip-types
tools/probe/verify-noland-brain-intro-window.ts`); both runs must be
byte-identical (same seed, same deterministic mGBA replay).
