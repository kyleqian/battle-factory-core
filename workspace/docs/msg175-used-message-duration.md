# msg175 — the "used" print's duration (no 24-frame floor) + Scene OFF Wish pause (ISSUES #167 (a))

Presentation only: kernel events, damage, RNG, turn order and facility state are unchanged (census kernel-event digests identical,
both scenes). Base `146bf9209`; production commit `bc425e1a6` (src tree `6546d44641881fafaabffed33078643a0b44b541`, unchanged after it).

## Results

| Check | Result |
|---|---|
| Source rule | `attackstring` -> BattlePutTextOnWindow: the battle printer shows **one glyph per row**; a line break costs no row. The print's next instruction waits on the controller until the printer is idle, and production's next command starts on G + 1 (G = the final glyph; idle98 / off108 convention). So the command lasts exactly its printable length L. |
| ROM sweep (committed off108 / off148 direct-mGBA receipts, r1 == r2; `msg175Anchors.ts`) | **72 / 72** uses: first glyph -> final glyph rows == L, **both scenes, both sides**, L = 16 .. 29 (`ONIX used\nTACKLE!` 16, `SNORLAX used\nTACKLE!` 19, `PRIMEAPE used\nWISH!` 18, `Foe ONIX used\nTACKLE!` 20, `PRIMEAPE used\nBULK UP!` 21, `Foe PRIMEAPE used\nWISH!` 22, `Foe SNORLAX used\nTACKLE!` 23, `PRIMEAPE used\nCONFUSE RAY!` 25, `PRIMEAPE used\nTHUNDER WAVE!` 26, `Foe PRIMEAPE used\nBATON PASS!` 28, `Foe MACHAMP used\nDYNAMICPUNCH!` 29). 11 more ROM uses are outside the tool's synthetic turn 1 (a two-turn move's attack turn, an RNG-different foe turn). |
| Production change | `STRINGID_USEDMOVE` timing `{ minimumFrames: 0, holdFrames }` (was 24): hold = the route-scoped `usedMessageHoldFrames`, else off108's `sourcePauseUsedMoveHoldFrames`, else 0. Both holds already counted from G. |
| #167 (a) Wish (Scene OFF) | **LANDED**, both sides residual **0** (ROM next "used" first glyph G + 51; production was −49 / −49 with no pause; the two candidate anchors 49 vs 45 / 41 now agree). Rule: a MoveEnd sprite-visibility receipt next, then the next action's USEDMOVE at instructionExecution u: P = Δ(moveend) + 7 + u − 2 − presented (40 + 7 + 4 − 2 = 49). Other continuations (end of turn, a switch, a pre-move print) keep no pause. |
| #167 (d) charge turn / Sand-Attack control | **NOT changed by this rule** (their opener is EMPTYSTRING3 or a 25-glyph print). With the floor gone the Scene OFF no-hit -> next "used" edge is a **uniform −12** on Bulk Up, Double Team, Sand-Attack, Protect, Detect, Agility (the old floor scattered them −8 .. −12); Dynamic Punch miss −11 / −12; Dig / Razor Wind / Solar Beam −10 / −13 / −13. Cause: the action transition (MoveEnd's remaining cases + the action dispatch + attackcanceler / accuracycheck before the next attackstring) is not presented; production shows only MoveEnd's sprite-visibility receipts. Not landed (see Remainder). |
| Census 0..999 (`msg175Census.ts` + `msg175CensusDelta.py`, base vs final, same tool file) | **OFF**: 1,000 battles, digests identical, 303,285 commands, **35,316 used prints changed** (21,157 with L ≥ 24: no frame change; 44,836 frames shorter in total), **70 Wish pauses** inserted (+3,486 frames), **0 unattributed**. **ON**: 1,000 battles, digests identical, 307,633 commands, **35,122 used prints** (44,658 frames shorter), 0 Wish pauses (OFF only), **0 unattributed**. Pre-existing budget-stalled 434 / 796 / 881 (census tool's 200k-frame input budget, both trees) now reach further: OFF 434 +11 / 881 +17, ON 796 +21 / 881 +24 commands appended after the base's last, no earlier change. `fixtures/msg175/census-delta-{off,on}.json`. |
| `compare:differential` fight-submenu / battle1-postwin-next-prompt / presentation-rng-playable-live-bodies-seeded-on `--base 146bf9209` | **PASS, 641 / 641 byte-identical** (235 + 216 + 190) |
| Tier-1 | `tests/msg175UsedMessageDuration.test.ts` (3: ROM duration == L, Wish 0 / 0, the −12 remainder pinned as named); re-pinned (cause: the 24-frame floor removed) `olnd113SceneOffPauses.test.ts` hold-shape pins 24 -> 0 (their ROM anchors unchanged: they already counted from the print's end), `battleResolutionPresentation.test.ts` used-move timing / duration (24 -> 0 / 20), `battleTurnPortability.test.ts` 2 used-move timings. The staged canonical turn's own `text` commands (`battleTurnPortability.test.ts:279,302`) are a different surface and unchanged. |
| Gates | see the worker's final report (typecheck, smoke 448 / 448, full suite in shards, build) |

## Remainder

- **The action transition (−12 in Scene OFF).** Same family as #167 (d)'s charge edge. The ROM spends 13 .. 15 rows between the
  last print's release and the next action's first glyph; production presents MoveEnd's 1-frame sprite-visibility receipts. With the
  print now exact, the residual is constant across six OFF no-hit classes, so a single source-derived transition hold looks landable:
  derive it from MoveEnd's cases + the next action's instructionExecution u (as the Wish rule does), check it on hit-path ->
  next-action windows (not in these receipts), then apply it at the seam for both scenes (ON adds −3 .. −6 from live-body tails).
- Wish followed by end of turn / a switch / a pre-move print (confusion, sleep) keeps no pause (unmeasured).
- #167 (b), (c), (e) unchanged.

## Reproduce

```sh
node --experimental-strip-types --no-warnings tools/integration/msg175Anchors.ts            # == fixtures/msg175/anchors.txt
npx vitest run tests/msg175UsedMessageDuration.test.ts tests/olnd113SceneOffPauses.test.ts tests/off148SceneOffPauses.test.ts
# census, per tree (base = git archive 146bf9209 with this tools/integration/msg175Census.ts copied in), scenes on / off:
node --experimental-strip-types --no-warnings tools/integration/msg175Census.ts --seeds=0..999 --scene=off --out=<tree>/off.jsonl
python3 tools/integration/msg175CensusDelta.py <base-off-dir> <final-off-dir> out.json    # == fixtures/msg175/census-delta-off.json
npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base 146bf9209
```
