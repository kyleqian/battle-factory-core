# Multi-hit prep: Double Slap (3), Comet Punch (4), Triple Kick (167)

Evidence only; every file is new, none is used by a test. Reproduce: `bash` loop over the six scenarios running
`python3 tools/run-mgba-probe.py <out> -- <mgba-venv python> tools/integration/multihitProbe.py <scenario> <out> <rgbdir> <moveId>` twice
(`PYTHONPATH=vendor/libmgba-py`), then `python3 tools/integration/multihitPrepBuild.py <dir> --write` (asserts run a == run b) and
`node --experimental-strip-types tools/integration/multihitChromeCheck.ts <dir>`. Detection is `allocatorNetZeroProbe.py`'s: first frame with
`gAnimScriptActive && sAnimMoveIndex == move`; the window ends at the first inactive frame. All six scenarios ran twice fresh: the per-frame
raw-RGB sha256 trace, script pointer, battler x/x2, HP and chrome hashes are identical (digests in `multihit-prep-evidence.json`). The window
starts/ends equal the accepted `tools/compare/fixtures/{double-slap,comet-punch}-natural-receipts.json` / `triple-kick-branch-receipts.json`
windows exactly (those receipts are Scene-ON natural controller captures; the probe uses the same scenarios and profile `battle-scene-on`).

## Per move / side / hit

| move | side | hit | activation (gAnimScriptActive && sAnimMoveIndex) | window | rows | gAnimMoveTurn | message in window | target x2 at activation | HP p/o |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DOUBLE_SLAP | player | 0 | 86 | 86..119 | 34 | 0 | `X used` / `NAME!` banner | 1 | 172/142 |
| DOUBLE_SLAP | player | 1 | 187 | 187..220 | 34 | 1 | blank window (chrome hash `882c435e…`) | 0 | 172/141 |
| DOUBLE_SLAP | player | 2 | 288 | 288..321 | 34 | 2 | blank window (chrome hash `882c435e…`) | 0 | 172/140 |
| DOUBLE_SLAP | opponent | 0 | 90 | 90..123 | 34 | 0 | `X used` / `NAME!` banner | 0 | 142/172 |
| DOUBLE_SLAP | opponent | 1 | 191 | 191..224 | 34 | 1 | blank window (chrome hash `882c435e…`) | 0 | 141/172 |
| DOUBLE_SLAP | opponent | 2 | 292 | 292..325 | 34 | 2 | blank window (chrome hash `882c435e…`) | 0 | 140/172 |
| COMET_PUNCH | player | 0 | 84 | 84..120 | 37 | 0 | `X used` / `NAME!` banner | 1 | 162/142 |
| COMET_PUNCH | player | 1 | 188 | 188..224 | 37 | 1 | blank window (chrome hash `882c435e…`) | 0 | 162/141 |
| COMET_PUNCH | player | 2 | 373 | 373..409 | 37 | 2 | blank window (chrome hash `882c435e…`) | 0 | 162/138 |
| COMET_PUNCH | player | 3 | 477 | 477..513 | 37 | 3 | blank window (chrome hash `882c435e…`) | 0 | 162/137 |
| COMET_PUNCH | opponent | 0 | 88 | 88..124 | 37 | 0 | `X used` / `NAME!` banner | 0 | 142/162 |
| COMET_PUNCH | opponent | 1 | 192 | 192..228 | 37 | 1 | blank window (chrome hash `882c435e…`) | 0 | 141/162 |
| COMET_PUNCH | opponent | 2 | 297 | 297..333 | 37 | 2 | blank window (chrome hash `882c435e…`) | 0 | 139/162 |
| COMET_PUNCH | opponent | 3 | 401 | 401..437 | 37 | 3 | blank window (chrome hash `882c435e…`) | 0 | 138/162 |
| COMET_PUNCH | opponent | 4 | 505 | 505..541 | 37 | 4 | blank window (chrome hash `882c435e…`) | 0 | 137/162 |
| TRIPLE_KICK | player | 0 | 225 | 225..261 | 37 | 0 | `X used` / `NAME!` banner | 1 | 151/142 |
| TRIPLE_KICK | player | 1 | 354 | 354..390 | 37 | 1 | blank window (chrome hash `882c435e…`) | 0 | 151/130 |
| TRIPLE_KICK | player | 2 | 483 | 483..519 | 37 | 2 | blank window (chrome hash `882c435e…`) | 0 | 151/108 |
| TRIPLE_KICK | opponent | 0 | 226 | 226..262 | 37 | 0 | `X used` / `NAME!` banner | 0 | 142/150 |
| TRIPLE_KICK | opponent | 1 | 436 | 436..472 | 37 | 1 | blank window (chrome hash `882c435e…`) | 0 | 116/150 |
| TRIPLE_KICK | opponent | 2 | 565 | 565..601 | 37 | 2 | blank window (chrome hash `882c435e…`) | 0 | 93/150 |

Every hit window starts at its own activation frame (offset 0), is exactly 34 (Double Slap) / 37 (Comet Punch, Triple Kick) rows, and `gAnimMoveTurn`
is constant inside it and equals the hit index (`Cmd_moveanimation` emits `gBattleScripting.animTurn` then increments it,
`battle_script_commands.c:1787-1788`; the controller copies it to `gAnimMoveTurn`, `battle_controller_player.c:2474`). Target x2 is the *settled* x2
at activation (sprite `x2` read from `gSprites[gBattlerSpriteIds[target]]`): hit 0 begins at the species idle x2 (Onix front idle = 1, player
orientation; the player-side Onix back sprite = 0), hits >= 1 begin at 0 because the previous hit's `AnimTask_ShakeMon` ends with a zero overwrite.
Attacker x2 is 0 in every window. HP does not change inside a window (it drops between windows), so `fieldProfile` HP is constant per fixture.

Source selectors (`reference/pokeemerald/data/battle_anim_scripts.s`): Double Slap `:438` and Comet Punch `:1007` use `choosetwoturnanim`
(`battle_anim.c:1073-1080`: `gAnimMoveTurn & 1` -> Right, so turn 0,2,4 = Left, 1,3 = Right). Triple Kick `:6543` uses `jumpifmoveturn 0` Left,
`jumpifmoveturn 1` Right, anything else Center (`battle_anim.c:1083-1091`); `TripleKickMoveTurn` is `0|1|2` (`src/animation/tripleKick.ts:4`), so clamp
`Math.min(turn, 2)`.

## Message / healthbox check (no adapter needed)

`multihitChromeCheck.ts` renders each of the 21 drafted fixtures through the production `renderBattleResolutionLiveView` (donor adapter PIN_MISSILE,
age 0, the fixture's `fieldProfile` and message lines) and compares message rows 112-159 and both healthboxes with the ROM frame at activation:
**0 residual pixels in all 21** (`multihit-chrome-check.json`). So: hit 0 = the default banner `<Foe >SPECIES used` / `MOVENAME!` (`DOUBLESLAP!`, as `names[]` in the
harness spells it), hits >= 1 = blank message window = `messageLines: ["", ""]`, and per-hit HP (opponentHp/playerHp at activation, constant through the window) gives
the exact healthbox bars. (The ROM prints the move-used text once; later hits show the empty window.)

## Recipe summary (how the live adapters and harness take several bodies)

* **Already-live "multi-hit" adapters are single-body.** Pin Missile 42, Spike Cannon 131, Twineedle 41, Fury Swipes 154 are one script invocation whose
  body already contains every projectile/swipe: `src/engine/liveMoveAnimation.ts:360-361` (41, 42), `:549` (131), `:562` (154) build a plain
  `{ move, attacker, target, fieldProfile }` config with no turn; durations `:190` (154 = `FURY_SWIPES_LAST_BODY_AGE + 1` = 48,
  `src/animation/furySwipes.ts:35`), `:184` (131 = 84); Twineedle 37 (`tests/animation/liveContactMoveAdapters.test.ts:33-35`). Their fixtures are one
  window per orientation (`physical2b-pin-missile-*.json` is just `{sourceFixture, move}` over source window 86-178; the scenario's second script body at
  256-348 is not compared). Nothing in them models per-hit state, which is why none of it transfers: Double Slap / Comet Punch / Triple Kick are **one
  invocation per hit**, selected by `request.turn`.
* **Turn selector pattern to copy:** Solar Beam `case 76` (`liveMoveAnimation.ts:222`, `:438`: `body: (request.turn & 1) === 0 ? ...`) and Brick Break
  `case 280` (`:242`, `:644`). `liveAdapterFramebuffer.ts:29-43` (`Fixture.requestFields {turn,power,damage}`, `denseWindow`, `denseSegments`, `messageLines`) and
  `:77` (`liveView`: `turn: f.body === "shattered-wall" ? 1 : 0, power: 0, damage: 0, friendship: 70, multihit: 0, ...f.requestFields`; message
  `:90` `f.messageLines ?? [used, NAME!]`) deliver `request.turn` to the config. Fixture merge `{...sourceFixture, ...fixture}` at `:109`.
  Per-hit rows therefore need **one fixture per hit** with `denseWindow` = that hit's activation..first-inactive and `requestFields.turn = i`; no
  `denseSegments` (each hit is contiguous) and no `ageOffset`.
* **Inherited per-hit state** lives in the existing draw cases, keyed on `view.moveTurn`: Comet Punch `battleScene.ts:52744-52775`
  (`state.age - 1 < 10 ? (moveTurn === 0 ? targetIdle.x2 : 0) : displayed.targetX2`), Double Slap `:52865-52892`, Triple Kick `:52961-52990`
  (moveTurn 1/2 enter from zero "even before their own task"). `SceneOn{DoubleSlap,CometPunch,TripleKick}Config` take `moveTurn`
  (`sceneOnPresentation.ts:4135-4160`). Config wiring for the adapter: `{ move, attacker, target, fieldProfile, moveTurn: request.turn }`
  (Triple Kick: `Math.min(request.turn, 2) as 0|1|2`); durations `case 3: 34`, `case 4: 37`, `case 167: 37`.
* **Gap an integration worker must close:** these three draw cases are *staged*: they hard-code species and sprites (`unsupported staged COMET_PUNCH pair`
  throws unless Ledian/Onix, `:52755`; likewise Double Slap Poliwhirl `:52878`, Triple Kick Hitmontop `:52974`) and take no `liveField` path, whereas
  the live-capable cases (Fury Swipes `:20169-20200`) branch on `liveField` and use `liveSceneOnBattlerArt` / `speciesFrontIdleRestOffsetOrZero`.
  The three need that port (all six accepted pairs use only POLIWHIRL/LEDIAN/HITMONTOP + ONIX, matching the drafted fixtures).
* **#142 shadow:** each hit window starts at its activation (offset 0), so the elevated-opponent shadow belongs on live age 0 of **every** hit
  (`multihit-shadow-rows.json`, 42 hit-rows in the issue142 row shape with `currentlyDrawn`/`needsFix` null because no adapter exists yet; the rule from
  `docs/issue142-shadow-rows.md` is "draw on age 0 iff window start == activation").

## Drafted fixtures (21, unused)

`tools/integration/fixtures/multihit-<move>-<side>-hit<i>.json`: double-slap player/opponent hits 0-2 (6), comet-punch player hits 0-3 and opponent hits 0-4
(9), triple-kick player/opponent hits 0-2 (6). Shape: `{move, probe: tools/integration/multihitProbe.py, probeArgs: ["<moveId>"], scenario, attacker,
target, fieldProfile (HP at activation, maxHP, male), denseWindow, requestFields: {turn: i}, messageLines: ["",""] (hits >= 1)}`. Hit 0 omits `messageLines`
(default banner verified). `probeArgs` supplies the move id the probe needs as its 4th argument (the harness only appends it itself for a fixed probe list).
Each fixture runs the probe fresh (~4 s, full trace) so the dense run needs nothing else; the probe keeps rgb only for hit windows. Remove the
`draft`/`schema` keys freely (the harness ignores them). Expected `liveMoveAnimationDuration` = rows (34 / 37 / 37, `ageOffset` 0).

## Remaining unknowns

1. **Production message between hits.** The fixtures encode the ROM (banner on hit 0, blank on later hits); what text the production presentation puts in the message
   window while a hit >= 1 body plays is not examined (`liveView` hard-wires the banner unless `messageLines` is set; the resolution presentation path was not read).
2. **Double Slap hits 3-4** (turn 3, 4; up to 5 hits) were not produced by these seeds (3 hits); behaviour is the same `turn & 1` branch as Comet Punch turns 3/4, which
   are captured (Comet Punch opponent has 5 hits). Triple Kick has at most 3 hits.
3. **Species coverage:** only Onix as target and Poliwhirl/Ledian/Hitmontop as attackers are source-accepted. Hit 0's target x2 depends on the live idle x2 (1 vs 0
   by orientation here), which for other species follows the `speciesFrontIdleRestOffsetOrZero` assumption; alternate-species proofs (as for #142) were not run.
4. **Shadow on hits >= 1** is derived from the offset-0 rule; with Onix (not elevated) the ROM frames cannot show it, so an elevated-species multi-hit control was not run.
5. **Pin Missile's second script body** (frames 256-348, `gAnimMoveTurn` 1) reuses the adapter and was never compared; same for the other single-body adapters' repeat hits.
6. **Residual overlap noted:** the chrome check's player-box rect is y >= 76 because the donor adapter's idle front sprite overlaps rows 72-75 (not healthbox pixels).
7. No dense framebuffer comparison of the drafted fixtures exists (no adapter): the sprite/field rows are unverified until the adapter lands.
