<!-- Read-only worker report (obr248 scout, 2026-11-05, Sonnet 5.5, 14 min; scratch /tmp/obr248 copied to .integration/validation/sv-20261104/obr248-scratch). Saved verbatim by the supervisor; UNVERIFIED — check every line number and frame before use. -->

# obr248 report: opponent faint-replacement ball bar (read-only scout)

I made no edits and no commits, and `git status` is clean at `bc74a02d3`. I ran no tests and no census. Scratch files are in `/tmp/obr248`, outside the repo. Frames are 1-based, and "A" is frame 501, the press that dismisses "Foe RATTATA fainted!".

The ROM is BLACK BELT SHIZUKA against our staged LADY ZOE. The two trainer names differ in length, which affects the print length (see rows 7 and 8). The scenarios are `tools/battle-lab/aud241b-opponent-faint-{on,off}.json` for the ROM and `tools/compare/appTrace.ts:1004` and `:1779-1780` for ours.

## Summary

- **The report is confirmed.** In our build the bar is a static, whole 6-ball bar. It appears at A+2, stays 26 frames and vanishes in one frame. It has no slide, no hold and no fade.
- **The ROM does three things we don't.** It slides the bar in over 20 frames, holds it 100 frames before the text, and fades it out over 16 frames.
- **The fix is presentation-only.** The kernel digest does not change, but app frame counts and anything pinned to them do.
- **The handoff is half right.** Its "per-ball delays + `_Exit`" description applies to the intro only. See the end of (1).

## (1) ROM timeline, same in ON (:8012) and OFF (:8014)

| Piece | Frame | Source |
|---|---|---|
| A press (SE_SELECT) | 501 | sound probe `snd-{on,off}.json` |
| Bar creation, `SE_BALL_TRAY_ENTER` pan 0 | 526 | `battle_interface.c:1666` |
| Slide-in start (first pixels) | 527 | pixel capture |
| Slide-in end (settled, 367 px) | 546 | pixel capture |
| Ball per-delay | none | `OnSwitchout` callback, `battle_interface.c:1513-1514, 1904` |
| Hold, creation to first glyph | 100 frames (controller 94) | see below |
| Text first glyph "BLACK BELT SHIZUKA sent out..." | 626 | message box first changes |
| Text print end | 660 | 35 frames of printing |
| Bar exit start | 664 | bar brightness 200.8 to 203.8 |
| Bar exit end (bar gone) | 679 | 16 steps, brightness 251.0 |
| `SE_BALL_OPEN` | 681 | sound probe |
| Message clear | not measured | the box still holds "sent out RATTATA!" through at least 697, where the next window begins |

- **Ball delay.** Mid-battle balls copy the bar's x2/y2, so there is no per-ball stagger.
- **93-frame hold.** `partyStatusDelayTimer` starts at 0 and `++ > 92` completes at the 94th tick (`battle_controller_opponent.c:1950-1963`). The 93 is only set for the intro skip, when flags & 0x80. A script call passes flags = 1, so this path always takes the 94-tick hold. The script then runs one command per frame (getswitchedmondata, switchindataupdate, hpthresholds, printstring), which puts the first glyph at C+100.
- **Exit.** It is `Task_HidePartyStatusSummary_DuringBattle` (`battle_interface.c:1779-1806`): a BLDALPHA blend over 16 steps, not a slide. The `_Exit` slide callbacks run only at battle start.
- **Tray sounds.** The probe shows exactly one tray SE in this window, `SE_BALL_TRAY_ENTER` at 526, in both scenes. There is no `SE_BALL_TRAY_BALL` (which plays at `battle_interface.c:1872`) and no `SE_BALL_TRAY_EXIT` (`:1870`).
- **Scene ON and OFF differ only in the message box.**
  - ON keeps "Foe RATTATA fainted!" visible from 501 until 626.
  - OFF clears the box at 502 and leaves it blank until 626.

## (2) Our timeline, production path (compare, `aud241b-opponent-faint-{on,off}`)

| Piece | Frame |
|---|---|
| Faint text cleared | 501 (both scenes) |
| Bar appears whole, 367 px, in one frame | 503 (A+2) |
| Text "sent out" prints | 504-528 (25 frames) |
| Bar gone in one frame | 529 |
| Bar visible | 26 frames in total |
| Next element after the bar (ROM 683 vs ours 549) | ours 134 frames earlier |
| ROM SE_BALL_TRAY_ENTER | we emit none |

## (3) Per-frame px diff before any fix (ROM vs app)

All figures are the same in both scenes unless noted. A pixel counts if any channel differs.

| Frames | Differing px per frame |
|---|---|
| 500 | ON 24, OFF 0 |
| 501-502 | 37 (OFF 502: 608) |
| 503 | ON 404, OFF 975 |
| 504-528 | ON about 1,000 rising to 1,212; OFF 395 rising to 1,160 |
| 529-530 | 882 / 907 (ON), 830 / 855 (OFF) |

- **Bar region.** The ROM bar is absent (still sliding) at 503-526, while ours is fully drawn at 367 px. From 527 to 546 the ROM is mid-slide while ours is already gone from 529.
- **Settled bar.** A separate comparison of the settled bar showed 118 px of difference, a mirrored ball order. Ours draws `states[index]` left to right, but the ROM fills real mons from the right: `states[5-index]`, the same mapping the intro uses (`battleScene.ts` `ballIcons`).
- **Frames 530-679.** I did not tabulate the full frame diff. Those frames differ whenever ROM and app are at different logical phases, because the two timelines are about 134 frames apart.

## (4) Code owners and minimal fix

**Owners**

| Piece | Owner |
|---|---|
| Opponent draw lasts 1 frame (`timing: undefined`) | `battleResolutionPresentation.ts:4913-4917`. Only battler 0 gets `PARTY_SUMMARY_DRAW_TIMING` (7 frames, `:917`). |
| Duration used by the orchestrator | `battleResolutionPresentationRender.ts:1640-1641` (`command.timing?.minimumFrames ?? 1`) |
| View shown as soon as the command is current or completed, and dropped as soon as the hide completes; no age | `battleResolutionPresentationRender.ts:2121` and `:2340` (view type `:1129`) |
| Static, unmirrored, no slide, no fade | `drawTypedPartyStatusSummary`, `battleScene.ts:55834` (called from the view at ~55503) |
| 20-entry slide table | `OPP_BAR_X2`, `battleScene.ts:3687` |
| No SE emitted | `battleStartSounds.ts` is intro-only (`core.ts:1038`) |

`opponentFaintPresentationOwner.ts` (the turn-13 owner) is not involved in the generic path. It is wired at `core.ts:1922-1934` and `battleSceneCanonical.ts:4015`.

**Fix design**

1. **Hold.** Give the opponent draw a timing, `{minimumFrames: 100}` from command start to the first glyph. This is one new constant in `battleResolutionPresentation.ts`. Calibrate at implementation by measuring first glyph = C+100, since the command-to-command handoff may cost a frame.
2. **Hide command.** It stays 1 frame, because the ROM script continues while the fade runs. The view must carry the bar for 16 more frames after the hide completes. That is a new age or fade state at `battleResolutionPresentationRender.ts:2121` and `:2340`.
3. **Drawing.** `drawTypedPartyStatusSummary` needs three changes, and per the ratchet in `bc74a02d3` they go in a new module, not `battleScene.ts`:
   - Slide x by `OPP_BAR_X2[age]` over 20 frames. The balls ride on the bar's x.
   - Order the balls with `states[5-index]`.
   - Apply a 16-step blend, 200.8 to 251.0 in brightness, over 664 to 679.
4. **Sound.** Emit `SE_BALL_TRAY_ENTER` pan 0 at command start, from an emitter keyed on the opponent `party-summary` draw (like `emitMidBattleSwitchSounds`, `core.ts:724`).

**Open items I could not source-prove**

- **The 25-frame lead.** The ROM waits from A (501) to C (526), where ours takes 2 frames. I did not trace which script rows fill it. It probably comes from the trainer's replacement choice and the preceding waitstate, but that is a guess and needs its own trace.
- **ON faint text.** ROM ON keeps the faint text until 626, while ours clears it at 501. I did not trace where our message-box clear lives.

**Kernel and logic timing**

- **Kernel unchanged.** The 100-frame hold is presentation duration. The kernel digest and the battle state are untouched.
- **What moves.** Every opponent faint replacement adds about 99 app frames. All later command start frames shift, including text, switch-in and its SEs. `route.frames` and frame-anchored pins move.
- **Precedent.** The lsd194 doc (`docs/lsd194-print-floor-and-drain.md:193, 236`) shows the same pattern: "frames-only pin movements, kernel-digest-identical", for example `sgl138-live-receipt.json` battle `19-off`.
- **Census.** `rst197CensusDelta.py` compares per battle: eventsDigest, error and command type sequence. Then it compares each command's fields, including duration (index 18).
  - I expect digest and error identical on all 1000 seeds per scene, and an identical type sequence.
  - The changed commands should be the opponent `party-summary` draw (1 frame to about 100), plus the start frames of downstream commands.
  - Any census delta in digest or type sequence would mean a bug.
- **Compare differential.** Traces that cross an opponent faint replacement will shift their captures. I did not enumerate them (I ran no differential), so the fix step must run `npm run compare:differential` to list them. `docs/frs247-faint-replacement-reshow.md` found no existing trace with a generic faint-replacement return for the player side. That claim does not cover the opponent side.
- **Soak.** The soak is in real frames, so battles that include a trainer replacement are about 1.7 s longer per replacement. The RNG stream is unaffected.

## (5) Shared code with the player-side intro tray

- **Shared tables.** `battleStartSounds.ts` imports `OPP_ICON_X2`, `PLAYER_ICON_X2` and the `*_CREATE_TICK` constants from `battleScene.ts` (lines 6-8; used at `:58` and `:63`). `OPP_BAR_X2` and `OPP_ICON_X2` live at `battleScene.ts:3687` and `:3705`.
- **Read-only reuse.** The fix should only read these tables. It must not change them or `ballTraySoundTicks`, so the aud241a pins stay put. Keep new code out of `battleScene.ts`, as the split-eligibility ratchet in `bc74a02d3` requires.
- **Intro versus replacement.** Intro balls have per-ball delays and `_Exit` slides, and play BALL and EXIT SEs. The replacement uses `OnSwitchout`, has no per-ball stagger and plays only `SE_BALL_TRAY_ENTER`. Reusing the intro tables per ball would be wrong here.
- **SE constants.** `screenSounds.ts:189-191` defines 114, 115 and 116.

