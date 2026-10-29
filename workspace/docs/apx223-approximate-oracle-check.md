# apx223 — approximate bodies vs the Scene ON ROM (evidence only)

The eight approximate bodies added by apx222 (`src/animation/approxScript.ts`, drawn by the `APPROX_SCRIPT` case in
`src/animation/battleScene.ts`) were never compared with the ROM. This sizes them, one staged window per body. No `src/` change;
approximate frames still carry no ROM receipt, and nothing here moves an exact / faithful count.

## Method

- **Ours**: the production live renderer on the apx222 census command (`apx217Strip`, same seeds / attackers as
  `tests/apx222LastStaticClassesApproximate.test.ts`), every presented row of the command.
- **ROM**: Scene ON oracle, `mechanicLab` with `overrides.parties` (three legal mons per side). The two leads are the census
  command's own species and genders at level 50 (the attacker's four slots = the move; the other lead's four = Splash). Bench = fixed
  fillers (species 1 / 4 for the player, 187 / 129 for the opponent; nature 0, IV 31, EV 0). Turn 1, `A`, 30 frames, `A`, then wait. A scouting run (every 3rd-4th frame, <= 250 captures
  per oracle run) finds the body from the manifest's attacker-side controller command (`CONTROLLER_MOVEANIMATION` = 15); a second set
  of runs captures **every frame** of it. Conversion 2 plays no body until the target has used a move, so its window stages the other
  lead with Tackle and presses `A` every 20 frames (`--other=33 --spam`).
- **Battle-field region**: rows 0-111 (above the text box) minus the two healthbox rectangles (x < 108, y < 48 and x >= 124, y >= 72);
  17 056 pixels. The healthboxes differ with the census battle's HP / status history, not with the body. A pixel counts when any RGB
  channel differs. The text box and healthboxes are therefore **not** sized here.
- **Visible body**: first..last frame whose field differs from idle (ROM: the frame before the command; ours: the command's static
  hold), ending at the first run of more than 4 idle frames. That drops the post-hit target blink (4 on / 4 off, ~1 000-3 000 px) and
  the HP drain, which the ROM's move-animation command stays active through (command lengths 91-818 frames, not the body).
- **Residual columns**: per-frame mismatched field pixels over **our visible rows** only. *Start-aligned* = our first visible row on the
  ROM's first visible frame. *Best shift* = the offset (relative to the ROM command start, within +-25 frames of start-aligned) with
  the lowest total residual; it is the better estimate of how well the *shapes* match once timing is allowed to slide.

Reproduce one body (ROM runs are cached under `--work`; `bin/oracle --profile battle-scene-on`):

```sh
node --experimental-strip-types --no-warnings tools/integration/apx223OracleCheck.ts --name=gust --seed=197 --move=16 --attacker=0 \
  --code=approx: --work=/tmp/a223/gust --out=tools/integration/fixtures/approximate/oracle-check --at=10,40,75 [--series]
```

## Result

Frames: ROM *visible* (ROM command length) / ours *visible* (ours rows). `lead-in` = idle frames between the ROM command start and its
first visible change; ours draws from row 0. Residual = mismatched field pixels per frame, median / max (17 056 px field).

| Body (census seed, user) | Frames ROM vis (cmd) / ours vis (rows) | lead-in ROM / ours | Start-aligned median / max | Best shift (frames) median / max | Visible defect | Suggested fix |
| --- | --- | --- | --- | --- | --- | --- |
| Ghost Curse (231, player Dusclops v Vileplume) | 349 (377) / 331 (353) | 14 / 19 | 47 / 14 042 | -2: **0** / 14 021 (206 of 353 frames exact) | The middle (ghost rise, nail scratches) is pixel-exact for 100+ frames; the black-field fade-in lands ~15 frames late (ROM wipes to black over ~14 frames, ours reaches black ~15 frames later = ~14 013 px full-field mismatch over rows 16-33), the field is restored ~24 frames before the ROM's (ROM black lasts longer), the Curse ghost icon is a dark grey where the ROM's is pale, and the attacker is 1-2 px off during the three scratches (~1 070 px blips). | Lead the black fade-in by ~15 frames, hold black ~24 frames longer before the restore, and lighten the ghost icon palette. |
| Pay Day (923, player Chansey v Kingler) | 71 (141) / 80 (82) | 13 / 0 | 170 / 1 945 | 4: 100 / 1 516 (9 exact) | Right shape, wrong clock: ours throws the coin from row 0 and the hit splat on Kingler comes earlier than the ROM's; a ~100 px baseline residual persists; the falling-coin tail differs and ours runs 9 rows longer. | Add ~13 lead-in rows, re-time the splat later, trim the coin tail (~9 rows). |
| Peck (51, opponent Clefable v Salamence) | 11 (91) / 16 (18) | 8 / 0 | 233 / 1 183 | 5: 233 / 883 (6 exact) | Both show the target shake; the ROM visible body is 11 frames (impact flicker, 898-1 183 px rows) vs 16 in ours, and the shake / impact sprite offsets differ by a few hundred px. The ROM's later 4-on / 4-off blink is the post-hit blink, not body. | 8 lead-in rows; cut the body to ~11 rows and fix the shake offsets. |
| Gust (197, player Chansey v Mantine) | 82 (186) / 87 (90) | 13 / 0 | 1 233 / 1 585 | 8: 1 037 / 1 291 (2 exact) | Wrong wind: the ROM funnel is drawn higher on the target (~y 5-45), ours ~15 px lower and larger; the ROM target mon shakes up and right, ours stays put. | Raise the funnel ~15 px and shrink it, add the target shake, add the 13-row lead-in. |
| False Swipe (705, player Chansey v Wobbuffet) | 68 (151) / 70 (75) | 10 / 0 | 209 / 1 684 | 7: **84** / 609 (10 exact) | Closest of the set: the slash is the same blue shape but offset by a few px and out of phase (best shift: median 84, max 609); ours draws the first slash a few frames early. | 10 lead-in rows; shift the slash ~3 frames later and a few px. |
| Barrage (803, opponent Chansey v Vigoroth) | 65 (269) / 66 (71) | 7 / 0 | 1 055 / 4 416 | 4: 393 / 3 292 (4 exact) | The ball flies faster in ours (hits the target at ~row 25, the ROM's much later) and its size / position at row 5 differ. The ROM command is 269 frames because Barrage hits repeatedly: after the hit blink the same body plays again (second repetition visible). | 7 lead-in rows; slow the ball flight; add the second-hit repeat. |
| Odor Sleuth (705, player Chansey v Wobbuffet) | 72 (149) / 75 (85) | 7 / 0 | 1 942 / 4 145 | 4: 876 / 3 922 (**37 exact**) | Ours holds a second copy of the target (two Wobbuffets) at rows 10 and 35; the ROM shows a single displaced target with a transient flicker (~1 300-3 100 px). 37 frames match exactly once slid by 4. | Remove the persistent duplicate target, draw the transient ghost blur; 7 lead-in rows. |
| Conversion 2 (736, opponent Chansey v Hitmontop) | 165 (818) / 162 (173) | 15 / 9 | 3 253 / 4 288 | 31: 2 519 / 4 288 (0 exact) | The ROM whitens the user and target sprites (white blocks and a silver band on Chansey); ours shows Chansey normally and the projectile sprites also differ, leaving a 2 500-4 300 px residual throughout. Length matches (165 vs 162). | Add the white palette blend on user and target, and fix the projectile sprites. |

Across the set: **visible lengths agree to within ~10 frames** for most bodies (Peck is 5 frames long, Pay Day 9, Odor Sleuth 3, Curse 18), and **every ROM body starts 7-15 frames after the command with idle rows that ours does not draw**. The live command's duration is
ours' own (approximate), so that lead-in is a presentation-length choice; if the rows are meant to track the ROM, add it per body
(Curse 14, Pay Day 13, Peck 8, Gust 13, False Swipe 10, Barrage 7, Odor Sleuth 7, Conversion 2 15). Shapes are the larger gap: only
Curse (middle) and False Swipe are near-exact; Gust, Barrage, Odor Sleuth and Conversion 2 would be recognisably wrong in motion.

## Evidence

`tools/integration/fixtures/approximate/oracle-check/<body>-rowNNN.png` — three start-aligned frames per body (**ROM | ours | diff**,
720x160; the diff panel is the ROM dimmed with mismatched field pixels in red; `rowNNN` = our row index). Curse rows 20 / 110 / 330,
Pay Day 5 / 35 / 55, Peck 3 / 7 / 12, Gust 10 / 40 / 75, False Swipe 10 / 35 / 60, Barrage 5 / 25 / 50, Odor Sleuth 10 / 35 / 65,
Conversion 2 20 / 80 / 150.

## Caveats

- One census command per body, one orientation, one species pair, one ROM run (the oracle replays from a canonical snapshot, so a
  repeat is the same frames); not an acceptance proof. The ROM state is the census lead pair at turn 1 with Factory-neutral
  IVs/EVs/items and no history, so HP, status, and the idle field differ from the census battle outside the masked healthboxes (a
  constant ~100 px floor in Pay Day is such an idle difference).
- The Barrage ROM command is multi-hit, so the pattern repeats a second time; the other seven are single-pass.
- The visible-extent rule (stop at > 4 idle frames) assumes the body has no internal gap that long; Odor Sleuth's ROM has a 3-frame
  ~10 700 px flash after a 6-frame gap (probably the monbg restore) that falls outside the 72 visible frames counted above.
- Conversion 2's 818-frame ROM command spans both turns (staged with the other lead on Tackle); its visible body is 165 frames.
- A first Barrage window used a stale field (wrong opponent species); only the corrected window is reported. The Curse opponent-side
  case (seed 138) was not run.
