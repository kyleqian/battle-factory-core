# STEEL WING residual-framebuffer diagnosis (read-only audit)

Audit date: 2026-08-04, animation lane, worker `worker/animation-20260804-144953`.
Status: **read-only diagnosis** — no production edits, no `src/` commits.

> **RESOLVED 2026-08-04 evening (all 197/197, move exact).** Both remaining
> player ranges are closed; two attributions in this doc are corrected by the
> implementing round's probes: (1) ages **144-155** were NOT the
> faded-vs-unfaded gust palette base — `gPlttBufferFaded` slot 23 holds the
> unfaded rotated ramp with no per-channel darkening; the divergence was the
> **two-gust overlap draw order** (player orientation renders index-0
> frontmost; the app drew index-1 last). (2) Ages **181-185** confirmed as the
> slide-back start: the slide-out's Q8.8 terminal is 23 (player), and
> `SlideMonToOriginalPos` starting there yields the measured 2/frame fall.
> This doc remains as the residual-map record; do not consume its 144-155
> palette hypothesis.

## Repro (both orientations, exact commands)

```sh
npx tsx tools/compare/steelWingPortable.ts tools/compare/fixtures/steel-wing-player-wingull-opponent-onix.json
npx tsx tools/compare/steelWingPortable.ts tools/compare/fixtures/steel-wing-opponent-wingull-player-onix.json
```

Measured framebuffer identity (fresh, twice-reproduced this audit):

| Orientation | dense window | production matched | recorded | verdict |
| --- | --- | --- | --- | --- |
| player-back Wingull -> opponent Onix | 197 frames (77..273) | **168/197** | 168/197 | no drift |
| opponent-front Wingull -> player Onix | 197 frames (81..277) | **140/197** | 140/197 | no drift |

Evidence hashes, RGB hashes, and the semantic/lifecycle checks all reproduce the
committed fixtures (`e321040c…`, `2f44c811…` / `7af04b35…`, `25c8e06b…`) exactly.

## Per-range verdicts

### Player orientation — 29 divergent frames: ages 9, 126, 144-165, 181-185

| ages | live probe state at range | production behaviour | mechanism verdict | confidence | fix direction |
| --- | --- | --- | --- | --- | --- |
| 9 (f=86) | `AnimTask_MetallicShine_Step[3,…,d10=4]`, BG1 hofs **0** | draws metal band with displayed `bg1X=initialX` (−48/−96), `metalBgLoaded` true from displayed shineAge 0 | **production enables the metallic BG1 highlight one callback too early.** Oracle BG1 hofs stays 0 through the initializer display and only takes its first callback value (480+bg1X) on the following display; production renders the initializer position for one extra frame. | confirmed | `battleScene.ts` STEEL_WING draw / `metallicShine.ts`: gate `metalBgLoaded` (and the metal draw) so the first displayed callback (shineAge 1) is the first drawn, or clamp the drawn hofs to the oracle's 0 on that one frame |
| 126 (f=203) | ellipse task gone (RAM atk x2=0); gusts at creation (47/97,102), scale 352 | attacker drawn at `steelWingEllipticalAtTick(15)` = (−5,1) | **production's elliptical reducer runs one tick too long.** Source `AnimTask_TranslateMonElliptical(0,12,4,1,4)` (speed 4 → wavePeriod 16): the wrap frame (data[5] wraps to 0) writes (−5,1) then **immediately resets to (0,0) and destroys the task** — (−5,1) is never a visible frame. Visible ticks are 1..14; production's reducer emits (−5,1) at tick 15. | confirmed (source-verified) | `steelWing.ts` `steelWingEllipticalAtTick`: tick ≥ 15 → `{x2:0,y2:0,active:false}` (active window 0..14) |
| 144-155 (f=221-232) | gusts `AnimGustToTarget_Step` translating to (176,42); slide-out terminal atk x2=23 | gust drawn at `view(age−1)` translation position, unfaded rotated palette | **divergence confined inside the gust sprite: gust positions (columns) and row profiles match the oracle exactly, but specific per-pixel colors differ** (e.g. age 150 pixel (145,30) O=`9c9c9c` A=`d6d6d6`). App uses the *unfaded* `steel-wing.json` gust palette; the oracle's `gPlttBufferFaded` gust slot stays permanently darkened (~3-7/channel) because `Move_STEEL_WING` never runs `set_original_pal` (cf. IRON_TAIL/METAL_CLAW which do) — the rotation count (4 at age 150) matches, but the base colors do not. Exact render-path interaction not isolated this audit. | plausible — palette fade-state mismatch, exact mechanism unconfirmed | confirm which palette (faded vs unfaded) actually renders via the VRAM/hardware palette, then feed the darkened base into the rotated-gust palette (or port the `set_original_pal` semantics) |
| 155 (f=232) | hitsplats created this frame (OAM 192/160,42), matrix 303; gusts still live at target | hitsplat **not yet drawn** (`displayed` view(154) → hitsplatAge −1) | **production's hitsplat first rendered frame is one late.** Oracle renders its hitsplat on the creation frame; the `displayed` one-frame lag defers the app's to age 156. | confirmed | `battleScene.ts` hitsplat draw: render from `view` (not `displayed`) for the hitsplat's creation frame |
| 156-164 (f=233-241) | hitsplats live, matrix **303** (0xD8 → 65536/216) constant | hitsplat drawn with hardcoded scale **372** (65536/176 = 0xB0) | **production uses the wrong hitsplat affine variant.** `create_basic_hitsplat_sprite … animation=1` selects `sAffineAnim_HitSplat_1` (0xD8 → matrix 303); production's 372 equals 0xB0 (`sAffineAnim_HitSplat_2`). 438px constant diff = hitsplat size/placement. | confirmed (source-verified) | `battleScene.ts`: use 303 (0xD8/`HitSplat_1`) for `animation=1` hitsplats, or port the affine variant selection |
| 165 (f=242) | hitsplat RAM gone (rendered last frame) | hitsplat drawn (view 164 → hitsplatAge 9) | **one extra/one-late frame of the same hitsplat mechanism** — the oracle's last hitsplat renders at age 165; production also draws it there but at the wrong scale. | confirmed | same as 156-164 |
| 181-185 (f=258-262) | `gSlideMonToOriginalPosSpriteTemplate` live; atk x2 RAM 20,18,16,14,12 | slide-back `currentX2:24`, 11-tick ramp (24/11 ≈ 2.18/frame) → view 21,19,17,15,13 | **production's slide-back runs one pixel high and slightly fast.** Oracle starts from the actual slid offset (RAM 23 → first decrement 20) and falls exactly 2/frame; the two converge at the midpoint (age 185) and match from 186. | plausible (rate/start verified; exact source arithmetic not re-derived) | `steelWing.ts`: derive slide-back `currentX2` from the actual slide-out terminal (23, not 24) and/or use the oracle's observed 2/frame decrement |

### Opponent orientation — 57 divergent frames: ages 0, 9, 111-165

| ages | live probe state at range | production behaviour | mechanism verdict | confidence | fix direction |
| --- | --- | --- | --- | --- | --- |
| 0 (f=81) | `gSpriteTemplate_EnemyShadow` live, cb `SpriteCB_EnemyShadow`, rendered as a 32×8 `526b63` blob at (160-191,65-72) | STEEL_WING compositor never draws the enemy shadow | **the oracle renders the attacker's enemy shadow for exactly the first dense frame** (shadow color `526b63` == battle-enemy-shadow.json `color`, 32×8); from age 1 it is invisible and production (no shadow) matches. | confirmed | `battleScene.ts` STEEL_WING block: draw the opponent enemy shadow (reuse `battleEnemyShadow` path) if/when the shadow's visible window is modelled |
| 9 (f=90) | same metallic initializer/hofer state as player | metal band at wrong position for one frame | **same as player age 9** — BG1 highlight one callback early. | confirmed | as player age 9 |
| 111-135 (f=192-216) | gusts live at (201,48)/(151,48) — y = **attackerCenter.y + 0**; scale shrinking 1820→256 | gusts at `startY = attackerCenter.y − 8` = 40 | **production's opponent-side gust creation y-offset is wrong.** `InitSpritePosToAnimAttacker(sprite, TRUE)` uses the attacker's Y_PIC_OFFSET: player back +8, **opponent front +0**; production hardcodes `attackerSide === "player" ? 8 : -8`. The −8 lifts the whole gust column 8px (2-px-wide vertical line, pd=256) and steepens dy to (targetY−40)/20, so the gust tracks 8px high all flight. | confirmed (probe + source) | `steelWing.ts` `steelWingGustAtTick`: `startY = attackerCenter.y + (attackerSide === "player" ? 8 : 0)` |
| 136-155 (f=217-236) | gusts translating left (x2 −58…−128, y2 +18…+40), slide-out atk x2=−24 | same startY/−dy defect carried through the flight | same mechanism as 111-135. | confirmed | as above |
| 155-165 (f=236-246) | hitsplats live 155-164 RAM, matrix 303; attacker −24 | hitsplat 372 + late first frame | **same hitsplat pair as player** (wrong affine 372 vs 303; first rendered frame deferred to age 156). | confirmed | as player 155-164 |

### Cross-referenced but ruled out

- **Front-idle two-frame cadence (rung-3 modules)**: the opponent-front Wingull's ANIMCMD state is `animNum=1, animCmd=2` (third program step = frame 0, rest) held at **every** probe age 0-165 — no two-frame toggling inside the dense window, and the `front-send-out-flight-*.json` cadence does **not** apply here (the ANIMCMD program long since ended at send-out). Ruled out as the cause of the opponent-front ranges. The `speciesFrontIdleRestOffset("ONIX")` constant already matches the opponent Onix at every age.
- **Gust palette-rotation timing**: rotation events are identical in both orientations (task `data[10]` 1/0 cadence, first event age 111), and the app's `displayed`-lag rotation count matches the oracle's rendered count at every sampled age (e.g. both 4 at age 150). Not a divergence source; the gust color difference is the faded/unfaded base, not the rotation phase.
- **Alpha/monbg blend**: the 12:8 blend is active in both orientations at ages 110+, and the player orientation's same-age attacker/gust renders match — so the blend is not the opponent's extra divergence (its whole flight is the startY −8).

## Mismatch counts summary

- player-back → opponent-front: **29** divergent frames (197−168): 1 + 1 + 22 + 5
  (9, 126, 144-165, 181-185).
- opponent-front → player-back: **57** divergent frames (197−140): 1 + 1 + 55
  (0, 9, 111-165). Note the recorded entry said "player ages 144-164"; this audit
  measures **144-165** (age 165 also diverges) — same total count, one boundary moved.
- Confirmed-by-evidence: metallic-start (player/opp 9), ellipse end (player 126),
  hitsplat affine 303-vs-372 (both 155-165), hitsplat first-frame latency (both 155),
  gust opponent startY −8 (opp 111-155), enemy shadow age 0 (opp 0).
- Plausible / needs next-step confirmation: player 144-155 gust interior (faded vs
  unfaded gust palette base), player 181-185 slide-back start/rate (23 vs 24, 2 vs 2.18).

## Files a fix step would touch (read-only here)

- `src/animation/steelWing.ts` — ellipse tick window (126), gust opponent `startY` (+0),
  slide-back `currentX2`/ramp.
- `src/animation/metallicShine.ts` + `src/engine/battleScene.ts` STEEL_WING draw —
  metal-band first-callback gating (9), hitsplat affine 303 + first-frame draw from
  `view` (155-165), enemy shadow (opp 0), faded gust palette base (144-155).
