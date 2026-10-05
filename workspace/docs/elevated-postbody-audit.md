# Elevated-opponent field after / before a live body (S10A side lane, 2026-10-05; ROM evidence audit, no production change)

Closes ISSUES #146 open item 3 (the 1,444 px after the Whirlwind BUTTERFREE body) and generalizes #145's end-of-body shadow class.
Every number below is a rendered production-vs-ROM comparison over stated frames, from **two fresh direct-mGBA runs per fixture with
identical digests** (`liveFixtureBatch.sh`, retained RGB sha256-checked against the probe receipts). Compact receipts:
`tools/integration/fixtures/elevated-postbody/` (176 KB, no RGB). Oracle: direct mGBA (`tools/probe/run-battle-lab-rgb.py` and the older per-move
probes), not the shared oracle service.

## 1. Results first

**Two independent production defects, both in the ORDINARY (no-live-effect) field renderer, plus one table gap shared with #145:**

1. **Ordinary resolution field draws an elevated opponent at ground level with no shadow** — `renderBattleResolutionSceneOffView`,
   `src/engine/battleScene.ts:54427-54433` draws `view.fieldArt.opponent.origin.y` (not `- enemyMonElevation(species)`) and never calls
   `drawGeneratedOpponentShadow` (the command-menu path does both: `battleScene.ts:8107-8121`). So **every ordinary frame with an elevated
   opponent** differs from the ROM — after a body (E+1…), and equally before it (message rows S-6..S-1). The 1,444 px of #146 is exactly this:
   BUTTERFREE sprite 8 px too low = 1,444 px; the 200-px shadow adds 134 visible px → **1,578 px** (Whirlwind, Dragon Dance), GOLBAT
   (elevation 8) **1,845**, PIDGEOT (elevation 4) **2,160**, MISDREAVUS 1,109, PELIPPER 2,053, SKIPLOOM 1,288 (opponent-sprite window).
2. **The shadow's return is keyed to the ROM script end, not to the accepted window end.** `SpriteCB_EnemyShadow`
   (`battle_gfx_sfx_util.c:1214`) hides the shadow while `gAnimScriptActive || battlerSprite->invisible`, so it reappears on framebuffer
   **(scriptEnd − E) + 1** (scriptEnd = first frame with no active script, `prep11Probe` body end; E = the accepted window's last row).
   Verified on 36 fixtures (table §2). Moves whose window ends exactly at the script end (d = 0, 184 of 214 derived rows) get the shadow on E+1;
   the others (d ≠ 0, §3) need their own row — this is the #145 Light Screen / Future Sight case (d = −2: shadow on the last 2 body rows) and its mirror
   (d > 0: shadow must stay hidden for d ordinary frames after the body: Absorb 2, Dream Eater / Horn Drill / Psybeam / Razor Wind / Sing /
   Sky Uppercut 1, Dragon Rage 21).

**In-memory patch proof (0 residual; untracked copy `src/engine/battleScene.patched.ts`, recipe `elevatedPostbodyPatch.sh`, diff
`fixtures/elevated-postbody/ordinary-field-elevation-shadow.diff` = +2/−1 lines):** with the elevation subtracted and the shadow drawn (suppressed for d
frames) the ordinary post-body field is **0 px for every row from E+1 until the ROM hides the shadow again** (the hit blink toggles
`battlerSprite->invisible`, 4 frames on / 4 off, or the next animation starts) — 36 fixtures, 30/30 rows where no blink intervenes (all opponent-attacker
rows), 5-26 rows before the blink otherwise. Pre-body (S-6..S-1): 0 px (7/8 swaps; the 8th is Absorb-BUTTERFREE whose window starts 4 frames after activation:
script active, shadow hidden → 200 px = the same rule).

### Affected moves / sides (post-body rows E+1.., opponent-sprite window x136-215 y0-72, production → patched)

| Group | Fixtures (move, attacker side, elevated species) | Production k=1 | Patched |
|---|---|---|---|
| Opponent attacker, natural | Whirlwind BUTTERFREE, Air Cutter GOLBAT, Pain Split MISDREAVUS, Stockpile PELIPPER, Mega Drain SKIPLOOM (×2) | 1,578 / 1,845 / 1,109 / 2,053 / 1,288 | **0, 30/30 rows** each |
| Opponent attacker, swapped to elevated (`elevatedPostbodyStage.py`) | Frustration, Seismic Toss, Uproar → GOLBAT; Swift, Ice Punch, Aurora Beam → PIDGEOT; Absorb, Dragon Dance → BUTTERFREE | 1,845 / 2,160 / 1,444 (Absorb) / 1,578 | **0**; Dragon Dance 4/4 then the stat-raise body starts (k=5) |
| Player attacker, elevated GOLBAT target | Absorb, Horn Drill, Sky Uppercut, Aurora Beam, Spider Web, Petal Dance, Giga Drain, Aerial Ace, Frustration, Seismic Toss, Swift, Future Sight, Ice Punch, Uproar, Razor Wind, Foresight, Leech Seed, Light Screen, Wrap, Dragon Rage, Sing, Psybeam | 1,699 (d>0) / 1,845 | **0** to the hit blink (5-26 rows) or 30/30 |

Every fixture shows it: it is not move-specific — it follows the elevated opponent (any attacker side, any move, any message/idle row).
**Not affected:** non-elevated opponents (ONIX etc.; no elevation, no shadow).

## 2. Mechanism evidence

* **Whirlwind BUTTERFREE** (`prep11-live/whirlwind-opponent-…butterfree…`, E = 398, window 316-398, 83 rows exact): body rows k ≤ 0 → 0 px.
  ROM frame 398 → 399 differs by **exactly the 32×8 shadow** (200 px at x160-191 y65-72, `bdbd9c→526b63`) and by nothing else, so the ROM's sprite does
  not move at the body end (elevated both before and after). Production k=1..: 1,578 px, bbox x148-202 y21-72; colours `526b63←bdbd9c` 134 (shadow
  absent), `42425a←f7f7ff` 81 / `ffffff←f7f7ff` 74 / `42425a←ffffff` 58 (sprite 8 px low: rigid shift fit ±3 px finds nothing — the offset is 8).
  Rendering the three frames side by side (ROM E+1 | production ordinary | production last body row): the body row (right) matches the ROM; the ordinary view
  (middle) draws BUTTERFREE ~8 px lower with no shadow.
* The live adapters are not at fault for item 3: their bodies are exact through E (and, for Future Sight / Light Screen, through the script end);
  the glitch begins when the queue hands over to the ordinary field.
* Shadow-return rule over rendered ROM frames (`romShadowToggles` in the receipts): first ROM shadow frame = d + 1 in all 36 fixtures (e.g. Absorb d=2 → +3,
  Sky Uppercut d=1 → +2, Dragon Rage d=21 → +22, Future Sight d=−2 → −1, Light Screen −1; all others +1). Pinned hermetically by
  `tests/elevatedPostbodyReceipt.test.ts`.

## 3. Script-end vs window-end table (`fixtures/elevated-postbody/script-end-vs-window-table.json`, 214 derived rows from `species-audit/derived-*`)

| d = scriptEnd − E | Moves (side) | Needed presentation |
|---|---|---|
| 0 (184 rows) | all others | shadow on E+1 (the ordinary renderer fix alone) |
| −2 | Future Sight (both), Light Screen (player) | shadow on the last 2 body rows (#145) |
| +1 | Dream Eater (p), Horn Drill (o), Psybeam (p), Razor Wind (p), Sing (p), Sky Uppercut (p) | ordinary field hides the shadow for E+1 |
| +2 | Absorb (both) | hide for E+1..E+2 |
| +21 | Dragon Rage (both) | hide for E+1..E+21 (the window is cut before the script ends) |

(Only measured d on GOLBAT-swapped fixtures; the script-end frame is the ROM body, not species-keyed — Absorb d = 2 reproduced with BUTTERFREE.)

## 4. Fix shape (not applied — production edits are out of scope)

1. **Ordinary field renderer** (`battleScene.ts:54427-54433`, all of `renderBattleResolutionSceneOffView`'s opponent draws):
   `origin.y - enemyMonElevation(speciesSymbol)` (or reuse `battleCommandFieldSpriteOrigin`, `battleCommandFieldArt.ts:112-125`, whose comment already says
   "Existing Scene OFF renderers already subtract this elevation at scanout") and `drawGeneratedOpponentShadow(fb, view.fieldArt)` before the sprite while the
   opponent sprite is visible. The faint-sink branch (`:54418-54426`) needs the same elevation; unmeasured here. Shadow must also hide for hit-blink invisible
   frames, a substitute, and transformed-to-non-elevated (ROM `SpriteCB_EnemyShadow`); the hit blink rows are the next presentation unit, not post-body.
2. **Live adapters / queue boundary** (the d table): a `LIVE_MOVE_OPPONENT_SHADOW_RETURN_ROW[moveId]` next to `LIVE_MOVE_OPPONENT_SHADOW_ROW`
   (`liveMoveAnimation.ts:176-236`): age at which the shadow reappears = `windowRows + d` (default `windowRows`, i.e. omitted). Adapters draw the shadow
   when `age >= row` (d<0: last 2 rows of 113 / 248 — #145's fix); for d>0 the first d ordinary frames after the effect suppress it (the ordinary
   view needs the move id / d from the finished effect, e.g. a `shadowHiddenFrames` field). Belongs half to each: end-of-body rows → adapters,
   post-body → the ordinary renderer.
3. **Tests to add:** (a) `renderBattleResolutionLiveView` with `effect: null`, opponent GOLBAT/BUTTERFREE/PIDGEOT: sprite y = origin − elevation and the shadow
   mask present; ONIX unchanged (0 diff vs today); (b) shadow-return table pin from `script-end-vs-window-table.json`; (c) live framebuffer batch above as a
   regression gate (`elevatedPostbodyRun.sh pl 30 opp …`: 0 px for k from 1 to the first ROM re-hide).

## 5. Limits / open questions

* The production post-body view is modelled as the displayed field with no live effect (what `forcedSwitchContinuationCompare.ts` also uses); the
  real queue's frame count between the move-animation command and the next command (message / HP bar) was not traced — a queue-side hold would change *which*
  ordinary frames exist, not their drawing.
* After the shadow re-hides (hit blink, 4 on/4 off; stat-raise or status body for self moves) the rows belong to the next unit; they were not claimed.
  Whether the existing `hit` effect already blinks sprite **and shadow** together was not measured.
* Older per-move probes (Safeguard, Heal Bell, Cosmic Power, Blizzard …) record only the window, so no post rows exist for them (the d table
  covers their window/script relation; `unreceiptedRows` marks frames outside a probe's sha256 list, e.g. Wrap 30/34).
* Player-side (back sprite) is unaffected (no elevation); not audited.
* Dream Eater / Sleep Talk player swaps fail the harness ("Sprite order unknown", reordered turn), not production.

## 6. Reproduction (workspace root)

```
# dense harness + comparison (2 fresh runs each; evidence /tmp/ep/<tag>/ev); args are word-split by sh -c
sh -c 'sh tools/integration/elevatedPostbodyRun.sh ww 30 opp tools/integration/fixtures/prep11-live/whirlwind-opponent-whirlwind-opponent-butterfree-player-onix.json'
EP_DIAG=1 node --experimental-strip-types tools/integration/elevatedPostbodyCompare.ts /tmp/ep/ww/ev 8 opp <fixture.json>   # bbox + colour pairs + shift fit
# patch proof (untracked copy; delete afterwards)
sh tools/integration/elevatedPostbodyPatch.sh; EP_RENDERER=battleScene.patched.ts node --experimental-strip-types tools/integration/elevatedPostbodyCompare.ts /tmp/ep/ww/ev 30 opp <fixture.json>; rm src/engine/battleScene.patched.ts
# opponent-attacker swaps: python3 tools/integration/elevatedPostbodyStage.py <list.tsv> > list; sh tools/integration/speciesAuditBodies.sh list bodies; SA_TAG=elevpb python3 tools/integration/speciesAuditDerive.py list bodies
node tools/integration/elevatedPostbodyReceipt.mjs <group> compare.json compare-patched.json out.json
node --experimental-strip-types tools/integration/elevatedPostbodyPrebody.ts <ev> 6 <fixture>...
npx vitest run tests/elevatedPostbodyReceipt.test.ts
```
