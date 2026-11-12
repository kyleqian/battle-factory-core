# rst139 — ordinary Scene ON rows draw the tracked idle rest (S10A presentation fidelity)

Side lane, new files only, base f2561e442 (production src ee7dc6b55). Banked patch, not landed.

## Results

| Item | Result | Receipt |
| --- | --- | --- |
| Exposure (census 0..999, Scene ON, base) | Only **ONIX** (front idle rest x2 +1) reaches an opponent slot with a non-zero rest (RATTATA, the other +1 species, is not in the level-50 pool). Presented non-body rows (ordinary + menu + handoff) with ONIX visible: tracked **idle 4,349 frames / 9 battles** (ordinary 3,947, menu 186, handoff 216), zeroed 34,141 / 9, **unknown 12,477 / 8 (not claimable)**. Player back sprites have no rest. Seeds: 27 134 196 205 312 428 731 780 851 | `tools/integration/fixtures/rst139/exposure.json` |
| ROM rule (8 direct-mGBA scenarios, explicit lab seed 305419897, r1 == r2 8 / 8) | Outside a battle animation script (gAnimScriptActive 0), a battler sprite's x2 / y2 moves **only** on the send-in / drag-in (SwitchIn_*) and faint controller paths. On message, HP, hit-blink, stat / status-icon, handoff and action / move menu rows it **holds** what the last script or send-in left: an ONIX / RATTATA opponent is at **x2 +1 after every send-in** (opening and Roar drag-in), **kept** through Confuse Ray, CONFUSION, Tail Whip + STATS_CHANGE, Harden + STATS_CHANGE, Splash, Tackle (attacker) and the confusion self-hit blink, and **0 after Karate Chop** (ShakeMon) until the next send-in. Player-side ONIX / PRIMEAPE back sprites, GOLBAT and SNORLAX are at 0. So production is wrong here, not right | `rom-receipt.json`, `probe-sha256.json` |
| Tracker vs ROM | production's own x2 tracker (applyLiveBattlerX2Event over the ROM's event order) predicts the ROM x2 on **22,746 / 22,746** settled non-anim rows | `production-compare-base.json` summary |
| Production today | renders the ordinary row at x2 0 always: **15,683 / 22,746 rows non-zero**, each exactly the rest shift in the opponent rect: ONIX **1,091 px**, RATTATA **410 px** (menu) / **1,119 px**. Zeroed and zero-rest rows 0 px | `production-compare-base.json` |
| Banked patch `fixtures/rst139/rst139-rest.diff` (5 src files) | ROM windows **22,746 / 22,746 rows 0 px** | `production-compare-patched.json` |
| Routes (9 ONIX census battles, every frame drawn as core.ts draws it, base vs patched) | a frame changes **iff** it is an at-stake row (ordinary / menu / handoff, tracked idle, rest != 0, visible): **4,349 frames == the exposure's idle count**, 0 unexpected, 0 missed, identical row sequences | `routes-delta.json` |
| Census 0..999 (sad133Census.sh, patched vs base) | **0 command / frame / status changes**, 10 / 10 shards' jsonl byte-identical (27,368 commands, 4,154,509 frames; pixels only) | `census-delta.json` |
| Canonical differential (patched copy, `--base` = its unpatched commit, src == f2561e442) | fight-submenu 235 / 235, battle1-postwin-next-prompt 216 / 216, presentation-rng-playable-live-bodies-seeded-on 173 / 173: **624 / 624 byte-identical** (no canonical trace has a tracked-idle ONIX / RATTATA) | this doc |
| Typecheck / suite of the patched copy | typecheck green; full suite 1 failed (boundary ratchet, fixed in the committed diff) / 13,673 passed | this doc |

Not claimed: `unknown` rows keep today's x2 0 (12,477 ONIX frames; ROM truth there is whatever the unmodelled event left). Faint rows
(sink), switch / party-summary / trainer-slide rows, the forced / voluntary party-select screens' frozen field and Scene OFF are untouched.

## The patch (what it does)

- `battleResolutionPresentation.ts`: optional `liveOrdinaryBattlerX2History` on the resolution state.
- `factoryRoundBattleOrchestrator.ts`: `prepareResolutionPalette` stamps the history BEFORE each presented command (every event
  strictly before it, the same cursor discipline as the body / banner inputs); exported `factoryRoundBattleResolutionForRender` (handoff /
  dismiss rows, and the first confirm-handoff row the command step returns before any palette pass, read the battle's current history)
  and `factoryRoundBattleOpponentIdleRest` (command UI).
- `battleResolutionPresentationRender.ts`: on an ordinary row (effect null / hit / stat / status; no switch-in / switch-out /
  party-summary / trainer-slide / move-animation command while it presents; no switch / summary view; not the doll) an `idle` opponent's
  `fieldArt.opponent.origin` moves by `speciesFrontIdleRestOffsetOrZero(species)`; `zeroed` / `unknown` keep 0.
- `battleScene.ts renderGeneratedBattleCommandPresentation`: optional `opponentIdleRest` flag shifts the opponent the same way.
- `core.ts`: draws the resolution through `factoryRoundBattleResolutionForRender` and passes `factoryRoundBattleOpponentIdleRest`.

## Landing recipe

1. On master (src == ee7dc6b55 or a descendant that still applies): `patch -p1 -d workspace < workspace/tools/integration/fixtures/rst139/rst139-rest.diff` (or `git apply` from the repo top with `--directory=workspace`).
2. Gates: `npm run typecheck`; `npm run test:smoke`; full `npm test` (record which tests move — see below); `npm run build`.
3. Proofs: `sh tools/integration/rst139Run.sh <fresh-dir-inside-repo> --census` from an UNPATCHED archive copy of this branch must stay
   ALL SAME (the runner applies the diff itself); after landing, the comparator in the landed tree must equal
   `production-compare-patched.json` (`node --experimental-strip-types --no-warnings tools/integration/rst139ProductionCompare.ts <raw> out.json`).
4. Differential: `npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base <pre-landing>` -> 624 / 624.
5. A tier-1 pin to add on landing: an ONIX-opponent ordinary resolution row with `liveOrdinaryBattlerX2History` idle draws ONIX one
   pixel right of the zeroed row, and the command UI with `opponentIdleRest` does the same (both 1,091 px in the opponent rect).

Tests that move: the patched copy's full suite (`npm test`, first diff version) = 1,647 files passed / 1 failed: only
`tests/animation/animationBoundaryRatchet.test.ts` (the render module imported src/animation directly). The committed diff reads the rest
through `liveBattlerAnchors(...).frontIdleRest` instead: ratchet 3 / 3, typecheck green, ROM windows and route delta byte-identical to
the receipts above (the census and the differential were measured on the first version; the fix is behaviour-identical, the route
frames prove it). No other test moved: the pins replay Scene OFF or never draw a tracked-idle ONIX / RATTATA.

## Rerun

    sh tools/integration/rst139Run.sh <fresh-out-dir-inside-the-repo> [--census]   # ~6 min; --census ~7 min more; ALL SAME
