# S10A prep49 — the sprite-ORDER host stops "return to ball", "next-mon summary while the opponent battler is tracked", "reshow without the opponent battler"

Evidence only (side lane, new files only). Census baseline: master `edbb2d8a1` (production src tree `f7cf9a74`), seeds 0..299, the
ordinary census driver. The temporary production patch is kept as `.diff` and was reverted before every commit.

## Results

**Census delta, seeds 0..299** (`census-delta-all-seeds0-299.json`): 300 battles, 7970 paired commands, the same seeds and command
sequence, **0 pairing mismatches**, the battle digest `bb30f5726abc…` identical, **0 live → fallback regressions**.

| src | live by count | live by frames |
|---|---|---|
| master | 7333 / 7970 = **92.01 %** | 1090942 / 1168273 = **93.38 %** |
| `prep49-temp-src-all.diff` | 7385 = **92.66 % (+52)** | 1099627 = **94.12 % (+8,685)** |

All three stops are gone from `orderHostStateWhenLendUnknown` with the patch. 49 of their 53 declines go live. The other 4 are player
Baton Pass follow-ups that now stop at other gates: 3 at the case-local gate, 1 at later-body. The remaining +3 come from
"sprite allocator history unknown" commands. Two independent census runs gave byte-identical reports.

**Classes** (`prep49OrderCensus.ts`, seeds 0..299; `census-before-seeds0-299.json` `stopClasses` / `stopCases`). "Stops" are the
order-host invalidations at the unit; declines are the lend-unknown commands whose host stop it is.

| stop | class (battle-script context) | stops | declines cmds / frames | verdict |
|---|---|---:|---:|---|
| return to ball | **R1 player Baton Pass**: `RETURNTOBALL` battler 0 @`BattleScript_EffectBatonPass`, in the segment after the player's party menu (reset + reshowBoth before it), then `switchinanim` | 13 | **33 / 5035** (all of the stop) | **EXACT** at every unit edge and the next body edge (2 leads × 2 runs) |
| return to ball | R2 opponent Baton Pass: `RETURNTOBALL` battler 1 @`BattleScript_EffectBatonPass` after its own move body (the AI picks; no menu) | 3 | 0 / 0 | **EXACT** (2 leads × 2 runs) |
| return to ball | R3 end-of-battle loss: `VARIOUS` battler 1 @`BattleScript_LocalBattleLostPrintTrainersWinText` after the player's last faint, then `trainer-slide-in`; always the last segment | 124 | 0 / 0 | **no change needed**: the battle ends and nothing is lent after it |
| next-mon summary while the opponent battler is tracked | **S1 the Factory AI's voluntary switch**: `drawpartystatussummary` 1 @`BattleScript_DoSwitchOut` at the start of a turn (host lastUnit `commit` 14, `animation` 1), with no move body, no faint and **no recall receipt** before it | 15 | **12 / 2156** | **EXACT** at the next body edge (prep47 (C) probes re-run fresh, 3 × 2) |
| reshow without the opponent battler | **X1 double KO**: forced party menu with **neither** battler sprite. Opponent Explosion 2 (6 / 1186), player Explosion 3 (2 / 474), player Double-Edge recoil 2 (0 / 0) | 7 | **8 / 1660** | **EXACT**: new plan `Cfee;Cfee;Cf` (2 leads × 2 sides × 2 runs) |

The final 1000-seed census showed the same shapes: 113 / 64 / 51 commands at these three stops.

On seeds 0..299 there is **no** Roar / Whirlwind on the player, no Memento, and no Pursuit-switch recall. The 124 post-move `VARIOUS`
recalls are the battle-loss return, now identified by the script label rather than inferred (prep47).

### R1 / R2 Baton Pass — EXACT

**Source.**
- `BattleScript_EffectBatonPass` (`data/battle_scripts_1.s:1694-1714`):

      attackanimation; openpartyscreen BS_ATTACKER; switchoutabilities; returntoball BS_ATTACKER; …; switchinanim BS_ATTACKER, TRUE

- `Cmd_returntoball` (`battle_script_commands.c:5346-5353`) is `BtlController_EmitReturnMonToBall(…, TRUE)`: always skipAnim, with no
  recall particles. This is the same controller path as Roar / Whirlwind's `returntoball BS_TARGET` (`:3328`), which production
  already maps to `forced-switch-out {side}` = `D o<battler slot>` (docs/forced-switch-continuation.md).
- For the player, `openpartyscreen` is the in-battle party menu. Its exit is the existing party-menu return: ResetSpriteData, then
  ReshowBattleScreen with both battlers. This is the orchestrator's forced switch-in path (`returnLiveSpriteOrderHostFromPartyMenu`),
  already applied before the recall.

**ROM** (`prep49Probe.py` BP_PLY / BP_OPP; `units.json`, `check-after.json`; every job twice fresh, 8/8 A == B):
- Bases: `mechanic-baton-pass-player-aipom-opponent-onix` re-timed so the menu's slot 1 is chosen; and its mirrored opponent scenario.
- Leads: Aipom 190 / Jolteon 135 (Baton Pass ×4) vs Onix (Tackle ×4).

Player, from the party-menu exit (F0 = identity):

    reshowBoth   Cf0 Cf1 Cf2e63e62 Cf3e61e60 Cf4        5/5 windows exact
    returntoball D0 (= o<player battler slot n0>)       1/1   forced-switch-out {player}
    switchInStart Cf0f5 Cf6                             2/2
    switchInParticles  unit edge exact (ROM window 39)
    next body (Onix Tackle 33) edge                     exact 2/2

- The particle unit is exact at its edge but only 13/34 per window, because the ROM merges plan windows. This is the existing
  production plan's documented in-window unobservability (docs/voluntary-switch-lend-audit.md §2.3), not new.
- Opponent: from the free order after the Baton Pass body, `D8` 1/1, then switchInStart {opponent} 2/2, then the particle edge.
  Next-body edge 2/2.
- **Host level.** On master the RETURNTOBALL invalidates "return to ball". With the patch, `forced-switch-out {side}`. The send-in then
  maps through the existing `followsForcedSwitchOut` to `switch-in-start` / `-finish {side}`, not `next-mon-send-out` (correct: no
  summary).

**Event sequence production must apply** (transform terms):
- Player: party-menu-reset → battle-reshow {player present} → forced-switch-out {player} → switch-in-start / -finish {player}.
  Every unit and transition already exists.
- Opponent: forced-switch-out {opponent} → switch-in-start / -finish {opponent}.

### S1 the AI's voluntary switch — EXACT at the next body edge (event mapping only)

**Root cause.** The kernel's `Cmd_returnatktoball` handler (`factoryBattleScriptFullTurnDecision.ts:1793-1800`) only advances; it
emits no `set-battler-sprite-visibility` receipt. The player's voluntary switch synthesizes one in presentation
(`battleResolutionPresentation.ts:3893-3908`); the AI's `BattleScript_DoSwitchOut` does not.
- So prep47 (C)'s production mapping (`isVoluntarySwitchOut(…, 1)`, `liveSpriteOrderHost.ts:292`) **never fires on real routes**,
  which is why it measured census +0.
- The tracker meets `drawpartystatussummary` 1 with the opponent battler still tracked.
- In all 15 census cases the summary carries `sourceLabel = BattleScript_DoSwitchOut`, with no earlier move body or faint in the
  segment.

**Source.** `BattleScript_DoSwitchOut` (`battle_scripts_1.s:3103-3121`):

    switchoutabilities; waitstate; returnatktoball; waitstate; drawpartystatussummary BS_ATTACKER; …; hidepartystatussummary; switchinanim BS_ATTACKER, FALSE

**ROM.** prep47's Perish Song AI-switch probes were re-run fresh (`prep47AiSwitchProbe.py`, 3 jobs × 2, A == B). Leads: Voltorb /
Electrode vs Misdreavus / Lapras.
- `ai-switch-units.json` is byte-identical to the prep47 receipt.
- The span plan (recall o8 + summary in the window of the 5th recall destroy + the send-in) is 3/3 all-windows exact.
- The production event chain `switch-out {opponent}` → `party-summary-next` → `party-summary-hide` → `next-mon-send-out` is exact at
  the next body edge 3/3 (`ai-switch-check.json`).
- The AI's switch reason differs between the probes (Perish Song) and the census (other `ShouldSwitch` reasons), but the presentation
  is the same script.

**Event sequence.**
- At a DoSwitchOut summary (battler 1, `BattleScript_DoSwitchOut`, no earlier MOVE_ANIMATION and no earlier battler-1 hide in the
  segment): `switch-out {side: opponent}`, then `party-summary-next`.
- A Pursuit-intercepted switch (a move body before it) keeps invalidating; it is unprobed.

### X1 double-KO reshow — EXACT (new plan `reshowNeither` = `Cfee;Cfee;Cf`)

**Source.** `reshow_battle_screen.c`:
- `CreateBattlerSprite` (`:208-275`) returns early for a battler with HP 0 (`:221` enemy, `:257` player).
- `CreateHealthboxSprite` (`:276-315`) creates both healthboxes regardless; it only hides a fainted side's (`:307-312`).
- Case 19 (`:137`) always runs `LoadAndCreateEnemyShadowSprites`.

So with both mons fainted, the reshow creates the player healthbox, the opponent healthbox and the shadow.

**ROM** (EXP_PLY / EXP_OPP: Glalie 347 / Electrode 101 Explosion vs Abra 63, both sides; 4 jobs × 2, A == B). From the party-menu exit:

    reshowNeither  Cf0e63e62 Cf1e61e60 Cf2              3/3 windows exact ×4
    switchInStart {player}  Cf3f4 Cf5                   2/2
    switchInParticles  unit edge exact
    party-summary-next  Cf3e59…e54                      1/1
    nextSendOut  unit edge exact; action-prompt Cf3f5   1/1     every unit edge 6/6 ×4

- Master's transform maps a reshow to `reshowPlayerGone` (`Cf;Cfee;Cfee;Cf`), so it is known 0/4 (`check-before.json`). With the
  patch it is 4/4.
- After the reshow, the survivors set the occupant roles: player healthbox n0, opponent healthbox n3, shadow n6 (ROM 0 / 1 / 2).
- Battler slots are `{player: null, opponent: null}`. The existing switch-in and the opponent's summary / send-out then apply
  unchanged. The census order was `Fo Fp party-menu-reset switch-in party-summary-next … next-mon-send-out` in 8/8 declines.

## Patch shape (temporary; `fixtures/prep49/prep49-temp-src-all.diff`, `*.diff -whitespace`)

**`src/engine/liveSpriteOrderHost.ts`**:
- `isForcedSwitchOut` (master :260): a RETURNTOBALL hide whose `provenance.sourceLabel` is `BattleScript_EffectBatonPass` (battler 0 or
  1) is a forced switch-out. The `followsForcedSwitchOut` send-in mapping follows automatically.
- New `isAiSwitchOutSummary`, used in `orderEventOf` (master :313, `draw-party-status-summary`): battler 1 at a DoSwitchOut summary →
  `{ event: switch-out {opponent}, then: party-summary-next }`.
- `returnLiveSpriteOrderHostFromPartyMenu` (master :201-210): `!opponent && player` still invalidates. Neither battler →
  `battle-reshow {playerBattlerPresent: false, opponentBattlerPresent: false}`.

**`src/engine/spriteOrderEventTransform.ts`**:
- :81: `battle-reshow` gains an optional `opponentBattlerPresent`.
- Before `UNIT_PLANS` (:280): `RESHOW_NEITHER_PLAN_TEXT = "Cfee;Cfee;Cf"`. It is kept out of `SPRITE_ORDER_UNIT_PLAN_TEXTS`, because
  `tests/spriteOrderBattleUnits.test.ts` pins that object to `spriteOrderUncoveredReplay.ts`. A fold may add it to both.
- :354 (`battle-reshow`): with `opponentBattlerPresent === false`, the player present fails "reshow without the opponent battler".
  Otherwise the reshowNeither plan, the slots null / null, and roles n0 / n3 / n6.

`npm run typecheck` is green with the patch. The full suite was not run with the patch.

**A production fold must add / move these tests:**
- `tests/liveSpriteOrderHost.test.ts`:
  - A Baton Pass segment, player and opponent: synthetic events with `B_SCR_OP_RETURNTOBALL` +
    `sourceLabel: "BattleScript_EffectBatonPass"`, then `switch-in-animation`. The host must stay known and equal reshowBoth (player) →
    `D o<slot>` → switchIn.
  - A DoSwitchOut summary without a recall receipt must apply the recall (opponent) before the summary. A Pursuit body before it must
    still invalidate.
  - `returnLiveSpriteOrderHostFromPartyMenu(host, {player:false, opponent:false})` = reshowNeither with roles n0 / n3 / n6.
    `{player:true, opponent:false}` still invalidates. Today's "reshow without the opponent battler" pin, if one exists, moves to that
    shape.
- `tests/spriteOrderBattleUnits.test.ts`: the reshowNeither plan (and its replay twin if added to `SPRITE_ORDER_UNIT_PLAN_TEXTS`).
- The prep47 (C) test idea (`switch-out {side: opponent}` recalls slot 8) now has a real-route caller.
- The comment in `isVoluntarySwitchOut` claims battler 1 maps on real routes. A fold should reword it: the kernel emits no receipt;
  the summary carries the recall.
- Consider moving `prep49Check.ts`'s three sequences into a Tier-1 fixture (`units.json` is compact, 126 KB).

## Instrument

`tools/integration/prep49OrderCensus.ts` is `prep48OrderCensus.ts` with these changes:
- Its private `orderEventOf` copies are brought to master `f7cf9a74`: Razor Wind 13 in the two-turn set, PresentHeal 20217, TURN_TRAP
  kinds, the opponent `switch-out`.
- At every order-host stop at one of the three units, the step's candidate context becomes a **stop case**.
  - Recall: opcode, battler, `provenance.sourceLabel`, the segment's last move body, faints before it, and the next event kinds.
  - Summary: label, last move, faints, recall receipts, and the host's lastUnit.
  - Reshow: earlier-segment faints with their script labels and moves.
  - Each case also gets the unit-log tail before the stop and the next 10 units after it (until revived or the battle ends).
- Every decline whose host stop it is carries `stop` and `unitsSinceStop`.

Report: `stopClasses`, `stopCases`, `stopDeclinesUnattributed` (0). Command records and digests are otherwise the census's.

## Reproduce

    OUT=<scratch> REC=<receipts> sh tools/integration/prep49Run.sh   # ~5 min; SKIP_PROBES=1 / SKIP_CENSUS=1
    # prints "same <file>" per receipt in tools/integration/fixtures/prep49/; src is applied from the .diff and reverted

Two runs were made:
- One from fresh probe directories (`SKIP_CENSUS=1`; 8 + 3 jobs × 2, all A == B) printed `same` for every probe / check / replay
  receipt.
- One full run (both censuses) printed `same` for all 10 receipts.

The corpus replay (`prep45CorpusReplay.ts`) is identical before and after the patch:
- turn-keyed corpus 1366 / 1159 / 1159 / **0 mismatched**;
- prep45 probe corpus 291 / 241 / 241 / **0**.

Files (`tools/integration/`):
- `prep49OrderCensus.ts`, `prep49Probe.py`, `prep49Extract.py`, `prep49Check.ts`, `prep49Run.sh`.
- Reused unchanged: `prep47AiSwitchProbe.py` / `prep47AiSwitchExtract.py` / `prep47AiSwitchCheck.ts`, `prep45CorpusReplay.ts`,
  `prep43CensusDelta.py`.

Receipts (`fixtures/prep49/`):
- `census-{before,after-all}-seeds0-299.json`, `census-delta-all-seeds0-299.json`
- `units.json`, `check-{before,after}.json`
- `ai-switch-units.json`, `ai-switch-check.json`
- `replay-before.json`, `replay-after-all.json`
- `prep49-temp-src-all.diff`

No RGB dumps and no mGBA logs.

## Not reached / caveats

- **R1's 4 follow-up declines** (3 case-local, 1 later-body) are other gates.
- **The AI DoSwitchOut probes are Perish Song-driven** (prep47's), not the census's own switch reasons. The script and controller path
  are identical. Both opponent leads are prep47's; no new lead was added.
- **A Pursuit-intercepted switch** (DoSwitchOut with a move body before the summary) is unprobed and keeps invalidating.
- **The Baton Pass and DoSwitchOut identification uses `provenance.sourceLabel`.** Production so far keys on `opcodeName` only, but
  the provenance contract (`battleDecisionBoundary.ts:122-128`) is the immutable interpreter receipt, kept "instead of asking
  presentation to infer a label from event order". A structural alternative for Baton Pass is "a RETURNTOBALL not of the latest
  move's target": Cmd_returntoball's only two script uses are Baton Pass and Roar / Whirlwind. This alternative was not measured.
- **Per-window exactness of `switchInParticles` / `nextSendOut` is partial** (13/34, 16/37). The ROM merges plan windows; both are
  existing production plans whose claims are edge-level. Every unit edge and every next-body edge is exact.
- **The census measured seeds 0..299 only.** The 1000-seed final census was not re-run with the patch.
