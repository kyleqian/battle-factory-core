# ISSUES #142 per-move shadow rows (all live ids x both orientations)

Evidence only (new files; no tracked file edited). Table: `tools/integration/fixtures/issue142-shadow-rows.json`. Scripts:
`tools/integration/issue142ShadowRowsResolve.py` (fixtures + windows + audit activations), `issue142ActivationProbe.py` / `issue142ActivationRun.py`
(activation probes for scenarios the allocator audit did not play; receipt `tools/integration/fixtures/issue142-activation-probes.json`),
`issue142ShadowRows.ts` (rendering + table), `issue142ShadowRowsDoc.py` (this document).

## Method

* **Rows:** every id of `LIVE_MOVE_ANIMATION_IDS` (`src/engine/liveMoveAnimation.ts:59`, 118 ids incl. the anchor3 block 86/87/107/116/203/207/263/339, which the 110-id scan and the net-zero audit predate) x {player attacker, opponent attacker} = 236 rows.
* **Row-0 mapping (exact):** `tools/integration/liveAdapterFramebuffer.ts` `verifyLiveAdapterFramebuffer` (lines ~121-141): `fixture = {...sourceFixture, ...liveFixture}`; `window = fixture.denseWindow ?? fixture.sourceWindow`; the probe frames with `window.startFrame <= frame <= window.endFrame` become live rows `rowIndex = 0..`, and the live age of a row is `age = rowIndex + (denseWindow.ageOffset ?? 0)` (`:142-143`). So live row 0 = ROM frame `window.startFrame` (age `ageOffset`; `ageOffset` is 0 for every resolved fixture except Take Down 36 and Detect 197 opponent rows, `denseWindow.ageOffset` 1: their window starts one frame after activation but live age 0 stands for the activation frame, so shadowRow is still 0 there — those two live fixtures never render age 0 themselves).
* **activationFrame:** first frame with `gAnimScriptActive && sAnimMoveIndex == move` in the accepted fixture's own scenario, from `tools/integration/fixtures/allocator-net-zero-audit.json` / `-ext.json` (`scenarios[].bodies[].activation`, same frame numbering as the fixture windows). The scenario is matched to the fixture by `(move, scenario)`; among several script bodies the one whose `[activation, cleanup]` contains the window start is used (the window start lies inside the chosen body for all rows). Scenarios the audit never played (Twineedle 41, Bite 44, Hyper Fang 158, Super Fang 162, Swagger 207 — these fixtures substitute the move id inside the poison-fang scenario via the probe's carrier patch; Mirror Coat 243's wall-family live scenario; Shadow Punch 325 dense scenario; anchor3 ids 86/87/107/116/203/263/339) were probed with `issue142ActivationProbe.py` (`allocatorNetZeroProbe.py` detection; carrier patches copied from `poisonFangProbe.py:24-65` and `superFangProbe.py:36-56`).
* **Windows not stored in a fixture:** Screech (receipt `screech-evidence.json` orientations[].window), Swords Dance (`swords-dance-receipts.json`), Ancient Power (`ancient-power-dense-evidence.json` source.sourceWindow), Brick Break (compare fixtures `brick-break[-normal]-*.json` have no `move` key; both bodies are offset 0; the table uses the normal body), Confuse Ray (fixtures have no window; `agilityProbe.py:63-68` defines the source window as starting at the first active frame = activation, offset 0 by construction). All recorded per row under `sources`.
* **shadowRow = activationFrame - windowStart + ageOffset**; `inWindow = 0 <= shadowRow < duration` (`liveMoveAnimationDuration`). A negative value means the window starts that many frames *after* the activation: the one-frame-visible shadow is outside the accepted window and the live render must NOT draw it (consistent with the exact controls).
* **currentlyDrawn:** the production `renderBattleResolutionLiveView` (via `liveAdapterFramebuffer.liveView`, so the same request/sprite-allocator input as the accepted tests) with a PHANPY player and an elevated **GOLBAT** opponent, rendered at *every* age `0..duration-1`; the shadow counts as drawn on a row only if all 200 mask pixels of `battle-enemy-shadow.json` (at 160,65) hold the shadow colour (a partial match is a body-colour coincidence — e.g. a non-elevated control still matches up to 177 px — and is stored as `partialRows`, never counted). Orientation = request.attacker, so the elevated GOLBAT is the target for player rows and the attacker for opponent rows.
* **needsFix** = inWindow && !currentlyDrawn. **wronglyDrawn** = a full shadow on any row that is not `shadowRow` and is before the cleanup frame (after cleanup `SpriteCB_EnemyShadow`, `battle_gfx_sfx_util.c:1214`, shows the shadow again, so such tail rows — Shadow Punch opponent ages 101-104 — are legitimate; recorded as `tailDrawnRows`). **alreadyCorrect** = inWindow && drawn on shadowRow && not wronglyDrawn. **notInWindow** = shadowRow outside the window (includes the wronglyDrawn rows).
* Reproduce: `python3 tools/integration/issue142ShadowRowsResolve.py /tmp/r.json`; (mgba venv) `issue142ActivationRun.py /tmp/r.json`; `node --experimental-strip-types tools/integration/issue142ShadowRows.ts /tmp/r.json` (~10 s); `python3 tools/integration/issue142ShadowRowsDoc.py`.

## Summary (rows = id x orientation)

| class | rows | ids |
| --- | --- | --- |
| needsFix | 128 | 70 ids |
| wronglyDrawn | 6 | 3 ids: 158, 207, 339 |
| alreadyCorrect | 40 | 26 ids |
| notInWindow | 68 (of which wronglyDrawn 6) | 34 ids |
| unresolved | 0 | - |

Every in-window row has `shadowRow == 0` (offset 0) — no live window starts the shadow on a later row — so the per-move rule is simply: **draw the elevated-opponent shadow on live age 0 iff the accepted window starts at the activation frame (offset 0)**, else do not draw it (and remove it where wrongly drawn).

* needsFix ids (70): 5, 11, 12, 14, 21, 25, 27, 29, 34, 36, 38, 39, 42, 43, 47, 49, 50, 56, 61, 65, 66, 67, 68, 78, 79, 83, 95, 97, 101, 103, 109, 112, 113, 114, 115, 122, 147, 148, 151, 156, 162, 172, 178, 180, 182, 186, 197, 201, 211, 213, 231, 238, 243, 246, 257, 259, 264, 272, 277, 280, 281, 287, 290, 302, 319, 320, 321, 335, 336, 341
  * needsFix in both orientations: 5, 11, 21, 25, 27, 29, 34, 36, 38, 39, 42, 43, 47, 50, 61, 66, 67, 68, 83, 95, 97, 101, 109, 112, 113, 115, 122, 147, 148, 151, 156, 162, 172, 178, 182, 186, 197, 201, 213, 231, 238, 243, 257, 259, 264, 272, 277, 280, 281, 287, 290, 302, 319, 320, 321, 335, 336, 341; player orientation only (the opponent-attacker row already draws it): 12, 14, 49, 56, 65, 78, 79, 103, 114, 180, 211, 246; opponent orientation only: 
* wronglyDrawn ids: 158, 207, 339 — both orientations, drawn on age 0 (200/200) although the window starts 4 (Hyper Fang, Bulk Up) / 7 (Swagger) frames after activation. Fix = stop drawing it there (the exact opposite of the missing-row-0 fix); not visible with Onix fixtures. (Shadow Punch 325 is *not* wrong: its extra rows are post-cleanup.)
* alreadyCorrect ids: 2, 12, 14, 23, 49, 56, 65, 78, 79, 86, 87, 103, 107, 108, 114, 116, 131, 154, 163, 180, 203, 211, 242, 246, 263, 306 (12, 14, 49, 56, 65, 78, 79, 103, 114, 180, 211, 246 only in the opponent-attacker role: `drawSourceOpponentEnemyShadow` call sites that exist today are attacker-only)
* notInWindow ids: 9, 41, 44, 48, 51, 55, 74, 75, 92, 93, 94, 105, 106, 124, 136, 158, 188, 204, 207, 208, 223, 227, 232, 235, 247, 294, 305, 325, 334, 337, 339, 342, 343, 347

Consistency check vs. the older `issue142-scan.json` (age-0 render of the same adapters, 110 ids): for every row with an accepted window the age-0 shadow presence agrees (0 disagreements; the 8 anchor3 ids are new).

## Cross-check against the known cases (docs/altspecies3-results.md, altspecies3-derivation.json)

| move | id | orientation row (player/opponent) activation | windowStart | shadowRow | inWindow | drawn today | expected (ISSUES refinement) | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Body Slam | 34 | 303 / 232 | 303 / 232 | 0 / 0 | True | False / False | offset 0 | agrees |
| Mega Punch | 5 | 76 / 80 | 76 / 80 | 0 / 0 | True | False / False | offset 0 | agrees |
| Night Shade | 101 | 217 / 218 | 217 / 218 | 0 / 0 | True | False / False | offset 0 | agrees |
| Brick Break | 280 | 234 / 220 | 234 / 220 | 0 / 0 | True | False / False | offset 0 | agrees |
| Karate Chop | 2 | 77 / 81 | 77 / 81 | 0 / 0 | True | True / True | offset 0 (control-exact: live already draws it) | agrees |
| Slash | 163 | 73 / 77 | 73 / 77 | 0 / 0 | True | True / True | offset 0 (control-exact: live already draws it) | agrees |
| Bite | 44 | 70 / 74 | 80 / 84 | -10 / -10 | False | None / None | +10, not in window | agrees |
| Toxic | 92 | 212 / 212 | 219 / 219 | -7 / -7 | False | None / None | +7, not in window | agrees |
| Confusion | 93 | 76 / 80 | 81 / 85 | -5 / -5 | False | None / None | +5, not in window | agrees |
| Psychic | 94 | 74 / 78 | 79 / 83 | -5 / -5 | False | None / None | +5, not in window | agrees |
| Shadow Ball | 247 | 251 / 255 | 256 / 260 | -5 / -5 | False | None / None | +5, not in window | agrees |
| Calm Mind | 347 | 291 / 291 | 294 / 294 | -3 / -3 | False | None / None | +3, not in window | agrees |
| Reflect | 115 | 65 / 69 | 65 / 69 | 0 / 0 | True | False / False | live window = activation (offset 0) | agrees |
| Acid | 51 | 69 / 73 | 76 / 80 | -7 / -7 | False | None / None | already correct (altspecies-live-evidence), not in window | agrees |
| Synthesis | 235 | 605 / 216 | 609 / 220 | -4 / -4 | False | None / None | already correct, not in window | agrees |

All 15 agree. Notes: Karate Chop and Slash are offset 0 but already draw the row-0 shadow (they are the exact controls in altspecies3 at offset 0); the five reliable acceptance cases Body Slam, Mega Punch, Reflect, Brick Break (shattered/normal, offset 0 in both bodies), Night Shade are all `needsFix`. Derivation offsets match altspecies3 exactly: Bite -10, Toxic -7, Confusion/Psychic/Shadow Ball -5, Calm Mind -3 (a negative shadowRow = window start − activation, the sign convention of the supervisor brief). The one place my numbers are not a plain copy: Toxic/Confusion/Psychic/Shadow Ball activation comes from the audit (accepted Onix scenarios: 212/76/74/251), which reproduces the altspecies3 accepted-scenario activations (window − offset).

## Caveats

* Brick Break rows use the normal body (turn 0); the shattered-wall body is also offset 0 (activation 288/289 = window start), so the same rule applies.
* Fixtures with several accepted variants (e.g. Haze, Light Screen, Focus Punch) agree on offset 0 across variants except where a different scenario starts later; alternates are listed under `sources.otherCandidates`.
* The rule is keyed on the accepted *Onix* fixture's window; alt-species windows differ only through their own derivation (altspecies3), which keeps the same offsets.
* `tailMissingRows`/`tailDrawnRows` are informational: the shadow also reappears after the script's cleanup frame, but accepted windows end at or before cleanup, so rows past it are unproven.
