# S10A prep47 — orchestrator-side order-host stops: retained locked-action continuation, battle-start entry seeds, opponent return to ball

Evidence only (side lane, new files only). Census baseline: master `2a5c0e2f9` (production src tree `21729666`), seeds 0..299, the
ordinary census driver. Temporary production patches are kept as `.diff` and were reverted before every commit.

## Results

**Census delta, seeds 0..299.** 300 battles and 7970 paired commands, with the same seeds and the same command sequence. Gameplay is
unchanged: 0 pairing mismatches, an identical battle digest `bb30f572…` (4,093,242 frames, 5,756 player turns), and **0 live →
fallback regressions** in every patched run.

| src | live by count | live by frames |
|---|---|---|
| master | 6831 / 7970 = **85.71 %** | 997779 / 1168273 = **85.41 %** |
| (A) `prep47-temp-src-retained.diff` | 6879 = **86.31 % (+48)** | 1005879 = **86.10 % (+8100)** |
| (A)+(B) `prep47-temp-src.diff` | 6906 = **86.65 % (+75)** | 1011661 = **86.59 % (+13882)** |
| (A)+(B)+(C) `prep47-temp-src-all.diff` | 6906 (+0 over (A)+(B)) | 1011661 (+0) |

Per stop:
- "command resolution without an action prompt": 43 of 123 commands go live, 7673 of 17456 frames.
- "unknown entry": 27 of 35 commands, 5782 of 7262 frames.
- 5 commands / 427 frames whose decline was another gate also went live.

The census is deterministic: two independent runs of the final instrument with the `-all` patch gave a byte-identical report and
commands file.

**Chain predictor** (`prep45Chains.py --cleared … --after`, using the prep47 shadow, which now sees the retained unit mid-chain):

| cleared set | predicted | predicted and live | predicted, not live | live, not predicted |
|---|---|---|---|---|
| (A) | 105 / 15132 | 43 / 7673 | 62 / 7459 | **0** |
| (A)+(B) | 140 / 22394 | 70 / 13455 | 70 / 8939 | **0** |

The 70 predicted but not live are fully explained:
- **61 / 7639 stop at the consumer gate "later-body (order lend not a first body)"**: 55 opponent and 4 player Dig unleash bodies, 1
  Return, 1 Fury Cutter. Their order is known; the Dig unleash consumer only accepts the `afterDigSetup` lend
  (`lendLiveSpriteOrder`, `digSetup` is set only when the Dig setup was the battle's first unit). This is the next stop for this
  chain: 59 Dig unleash commands / 7314 frames.
- 2 / 102 stop at the case-local gate (Mud-Slap).
- 7 / 1198 stop at order units the shadow cannot see after an unknown battle-start seed, because the shadow starts null: FRZ,
  Shock Wave 351:player, and "next-mon summary while the opponent battler is tracked".

**Corpus replay** (`prep45CorpusReplay.ts`):

| replay | edges | known | exact | mismatched |
|---|---:|---:|---:|---:|
| turn-keyed corpus, master | 1366 | 1143 | 1143 | **0** |
| turn-keyed corpus, every prep47 patch | 1366 | 1143 | 1143 | **0** |
| prep45 probe corpus, master | 291 | 241 | 241 | **0** |
| prep45 probe corpus, every prep47 patch | 291 | 241 | 241 | **0** |

The replay is byte-identical before and after. (A) and (B) change only the orchestrator / seed. (C) changes `switch-out`, which no
corpus edge uses.

### (A) Retained locked-action continuation — EXACT (orchestrator prompt cycle at the turn boundary)

**Classification (census, seeds 0..299; `census-before-seeds0-299.json` `withoutPromptByClass` / `withoutPromptCases`).**
- All 123 first-unit declines (17456 frames) are a **retained opponent locked action while the player is not locked**.
- 138 prompt cycles were affected: 132 continuations and 6 "fresh (no receipt)", where the locked battler fainted before its
  continuation printed.
- There are **0 player-locked cases**. A locked player never reaches `beginCommandResolution` with a command in this driver: no prompt,
  so the orchestrator's automatic continuation handles it.
- In the 132 continuations the continuation segment's first mover is the opponent in 101, the player in 23, and neither (no move body)
  in 8.

| class (opponent's locked move, status2 lock) | cases | first-unit cmds / frames | live with (A) cmds / frames | still declining at |
|---|---:|---:|---:|---|
| Dig `[MULTIPLETURNS]` continuation | 55 | 89 / 11269 | 18 / 2451 | later-body gate (Dig unleash) 57, Dive 291 words 12, Hail 258 2 |
| Petal Dance `[MULTIPLETURNS\|LOCK_CONFUSE]` continuation | 11 | 24 / 4809 | 19 / 4209 | Fury Cutter 210 (unplanned) 4, later-body 1 |
| Petal Dance, fresh (no receipt) | 1 | 1 / 58 | 1 / 58 | — |
| Rollout `[MULTIPLETURNS]` continuation | 19 | 5 / 525 | 1 / 160 | later-body 2, case-local 2 |
| Solar Beam `[MULTIPLETURNS]` continuation / fresh | 6 / 1 | 1 / 237, 2 / 425 | 1 / 237, 2 / 425 | — |
| Ice Ball `[MULTIPLETURNS]` continuation | 8 | 1 / 133 | 1 / 133 | — |
| Dive, Fly, Bounce, Razor Wind, Outrage continuations; Rollout / Ice Ball fresh | 18, 8, 4, 2, 1; 3, 1 | 0 (involved only) | — | — |

**ROM (26 direct-mGBA jobs, 13 lock classes, 2 lead species each, each job twice fresh: 26/26 A == B; `units.json`, `check.json`).**
- Opponent-locked classes: Dig, Petal Dance, Rollout, Solar Beam, Ice Ball (the census classes), Dive, Outrage, Razor Wind, Hyper Beam
  (recharge), Uproar, Thrash.
- Player-locked controls: Petal Dance, Dig.
- Lead variants: the non-locked lead was varied (Snorlax 143, Golbat 42 / Skarmory 227 where Onix would be KO'd, Magnemite 81 for
  the genderless Ice Ball lead).

Gap tokens: `P` = the action-prompt bounce pair (2-sprite `f` create + paired destroy), `H` = a hit blip. Typical sequences:

    dig-opp        B91o [P] B91o [H] B45p …              opponent Dig: the player's prompt sits between setup and unleash
    pd-opp-snorlax B80o [H] B33p [HP] B80o [H] B33p …    opponent Petal Dance: one prompt per turn boundary
    ro-opp         B205o [H] B33p [HP] B205o [HP] B205o …
    dig-ply        B91p [] B91p …                        player locked: no prompt between its bodies

Totals:
- **36/36 spans as expected.** A span is the stretch between consecutive bodies of the locked move.
  - Opponent locked: exactly 1 `P` per turn boundary. Hyper Beam's span also holds the bodyless recharge turn, so 2 boundaries and
    2 `P`.
  - Player locked: the first locked span has 0 `P`.
- **37/37 prompt pairs exact per window.** Each check starts the production tracker from the ROM free order at the gap's first frame.
  `action-prompt` must match the create window and `actions-committed` the destroy window, in created / destroyed slots and free order.
- **97/97 hit blips exact. 114/114 gap → next body edges exact.**
- **Host level: 36/36.** Every opponent-locked boundary pair goes through `beginLiveSpriteOrderTurn(host, sameRequestId, promptShown)`
  on a drained retained cursor, then `advanceLiveSpriteOrderHost` into the appended segment.
  - `promptShown = true` (the patch): exact against the ROM.
  - `false` (master's retained path): 0 known.

**Source.** `HandleTurnActionSelectionState` (`battle_main.c:4160-4164`) skips `BtlController_EmitChooseAction` only for a battler with
`STATUS2_MULTIPLETURNS | STATUS2_RECHARGE`. The non-locked player is prompted as on any turn.

**Event sequence production must apply.** At the intervening command's submit (`beginCommandResolution` with a retained owner):
`action-prompt` + `actions-committed`. They come after the retained resolution's last segment, which is drained by then, and before
the appended continuation segment's first event. This is exactly the existing prompt cycle on the same request id. Only a locked
**player** has no prompt, which is unchanged: it invalidates, and never occurs in this driver.

### (B) Battle-start entry seeds — EXACT for every class seen on seeds 0..299

**Census** (`battleStartSeeds`, from `initializeFreshFactoryBattle` replayed with the orchestrator's own inputs; 300/300 replays match
the started battle and the production seed):

| events | battles | seed on master | unknown-entry declines | seed (patch) |
|---|---:|---|---:|---|
| none | 271 | known entry | — | unchanged |
| one Intimidate triple (either side) | 17 | pre-prompt + stat 22 | — | unchanged |
| `message STRINGID_PKMNTRACED` (Trace, no hook copied) | 9 | unknown | 16 / 3286 | **known entry** |
| Intimidate triple + `STRINGID_PKMNTRACED` | 1 | unknown | 13 / 2990 | **pre-prompt + stat 22** |
| `message STRINGID_PREVENTEDFROMWORKING` (Intimidate vs Clear Body) | 1 | unknown | 4 / 562 | **known entry** |
| Intimidate triple on each side | 1 | unknown | 2 / 424 | **pre-prompt + stat 22 + stat 22** |

No weather ability (Sand Stream / Drought / Drizzle) leads in these 300 battles: not probed.

**ROM (17 jobs, each twice fresh: 17/17 A == B; `seed-units.json`, `seed-check-{before,after}.json`).** Lead pairs:
- Trace: 4, both sides.
- Clear-Body-prevented Intimidate: 3, Tentacruel 73 / Metagross 400 vs Gyarados / Arcanine.
- Both-side Intimidate: 3, Gyarados / Arcanine / Granbull.
- Intimidate + Trace: 3, either side faster.
- Controls: 2 none and 2 single Intimidate.

Results:
- **17/17**: the windows before the first animation-script allocation / prompt pair are exactly
  `BATTLE_LAB_ORDINARY_SINGLES_ENTRY_WINDOWS` without its prompt pair, leaving F = `knownEntryPrePromptSpriteOrderState`.
- **56/56** stat-copy (`C[3];D[3]`, inside the animation script) and prompt windows are exact under the production tracker.
- **17/17** first-move edges are exact.
- Token shapes per class: none / Trace / prevented `P`; single Intimidate / Intimidate + Trace `SP`; both-side `SSP`.
  - Trace and the prevented Intimidate are byte-identical to the no-event entry: 78 windows, prompt `C[3,4] D[4,3]`.
- The src seed fed the class's census event shape, then the first `beginLiveSpriteOrderTurn`:
  - master: 4 exact, 13 unknown;
  - patch: **17 exact**.

**Seed rule (patch).** The events must parse as Intimidate triples (`stat-stage-change`, one `STATS_CHANGE` animation with argument
22, `message`) and the ROM-checked lone messages `STRINGID_PKMNTRACED` / `STRINGID_PREVENTEDFROMWORKING`, which allocate nothing.
- No triple: the known entry.
- k triples: `knownEntryPrePromptSpriteOrderState` plus k × `stat-animation 22`, with `bodies` = k.
- Anything else stays unknown history.

### (C) Return to ball — REACHED in Scene ON; the opponent analogue holds at the edge; census +0 (not the census's recall)

- **Reached** with re-timed multi-turn inputs (`prep47AiSwitchProbe.py`, 3 jobs, each twice fresh, A == B).
  - Base: `mechanic-factory-ai-switch-receipt-c2-perish-off` re-profiled to Scene ON, with 5 × (A, 30, A, 900) turns.
  - Perish Song x4 opponent lead (Misdreavus 200 / Lapras 131); Soundproof player lead (Voltorb / Electrode) so that no player faint
    / party menu drops rows.
  - `ShouldSwitchIfPerishSong` (`battle_ai_switch_items.c:20-28`) switches at the turn-4 selection.
- **Allocation windows** (identical span plan in all 3 jobs; `ai-switch-units.json`): the turn-4 prompt pair, then the switch-out
  special animation (mv 0), then the send-in, then the next body. As one plan:

      Cf×16;D0;D1;D2,o8;D3;Cfeeeeee/D4;D5;…;D15;Cff;Cf;D22,21,20,19,18,17,16;Cf×15;D23;D26;…;D38;D25;D39;D40   (survivor = new battler)

- **Opponent analogue.**
  - The recall is exactly `spriteOrderRecallPlanText(8)`, the player's voluntary-recall plan with the opponent battler (slot 8).
  - The next-mon summary (`Cfeeeeee`) is created in the window of the recall's 5th destroy. `BattleScript_DoSwitchOut`:
    `returnatktoball; waitstate; drawpartystatussummary`.
  - The send-in that follows is its own window sequence: 18 creates, unlike the post-KO `nextSendOut`'s 19.
- **Check** (`ai-switch-check-{before,after}.json`):
  - The composed plan is 67/67 windows exact ×3 and the next-body edge is exact ×3.
  - `recall + summary + nextSendOut` diverges at window 48, but reaches the **same free order at the next body edge** (×3), as does
    the kernel-order sequential form.
  - So the production event chain `switch-out {opponent}` → `party-summary-next` → `party-summary-hide` → `next-mon-send-out` is
    **exact at the next body edge** with the patch (3/3); master gives unknown (3/3).
  - Only the opponent `switch-out` unit is new; the rest are existing units.
- **Census +0.** `returnToBallCases` (129 recalls):
  - mostly `B_SCR_OP_VARIOUS` battler 1 right after the opponent's move, i.e. the Frontier loss path's return of the opponent mon at
    battle end, so no later bodies;
  - 13 `B_SCR_OP_RETURNTOBALL` battler 0 with no earlier move body in the segment (not identified);
  - 5 Baton Pass (`RETURNTOBALL` battler 1);
  - 2 `VARIOUS` battler 1 with no earlier body.
  - **None is the AI's voluntary `RETURNATKTOBALL`**: the FIGHT-only policy never builds a perish count.
  - Reading the post-move `VARIOUS` battler-1 recalls as the battle-loss return is an inference from their context (opponent move,
    then recall), not probed. On that reading, the 33 "return to ball" first-unit declines come from the 13 / 5 / 2 other forms,
    which need their own identification; not reached.

## Patch shape (temporary; `fixtures/prep47/*.diff`, `*.diff -whitespace`)

`prep47-temp-src-retained.diff` (A), 2 files:
- **`src/engine/factoryRoundBattleOrchestrator.ts:1854`** (`beginCommandResolution` → `beginOrderTurn`): `promptShown`
  `retained === null && !playerLocked` → `!playerLocked`.
  - Comment updates at `beginOrderTurn` (:1717-1722) and in `liveSpriteOrderHost.ts`: the header (:27-29) and the
    `beginLiveSpriteOrderTurn` doc (:205-209).
  - Host code is unchanged: the retained resolution keeps its request id, its drained cursor continues into the appended segment, and
    `promptRequestId` stays equal.

`prep47-temp-src.diff` = (A) + (B):
- **`src/engine/liveSpriteOrderHost.ts:131-150` (master; ~:131-160 patched)**: `seedLiveSpriteOrderHostFromBattleStart` parses the triple / lone-message
  sequence (rule above). It uses `BATTLE_START_SEED_MESSAGES`.
- **The orchestrator seed comment** (:1135-1136).
- The allocator host seed is untouched (`firstMove`). The stat copy is occupancy-net-zero, as for the single Intimidate.

`prep47-temp-src-all.diff` = (A) + (B) + (C):
- **`src/engine/spriteOrderEventTransform.ts:82`**: `switch-out` gains an optional `side`.
- **`:369`**: it recalls `slots[side]` with `spriteOrderRecallPlanText(slot)`.
- **`liveSpriteOrderHost.ts:272`** `isVoluntaryPlayerSwitchOut(events, index, battler = 0)`, and **`:351`** (`orderEventOf`): a
  `RETURNATKTOBALL` hide of battler 1 before any move body of the segment → `switch-out {side: "opponent"}`.

Typecheck (`npm run typecheck`) is green with each patch. The full suite was not run with a patch.

**A production fold must add / move these tests:**
- (A) An orchestrator test: an opponent locked action (e.g. Dig or Petal Dance) retained across a player command. The order host must
  stay known across the continuation, its free order must equal the prompt-cycle result, and the continuation's first body must get a
  lend.
  - Today nothing pins the invalidation itself; `tests/liveSpriteOrderHost.test.ts:20` only names it in a comment, which needs
    rewording.
  - Pin `beginLiveSpriteOrderTurn(drainedRetainedHost, sameId, true)` = prompt cycle, and the locked-player invalidation unchanged.
- (B) `tests/liveSpriteOrderHost.test.ts:290-316` (the "battle-start events" test):
  - `[...triple, ...triple]` becomes known: the pre-prompt state + 2 stat plans; the ROM gives `SSP`.
  - The generated-seed loop's `n > 0 && n !== 3 → unknown` branch must be re-classified for the Trace / prevented / Intimidate+Trace
    / double shapes.
  - Add unit cases for the lone messages, an unlisted message (still unknown) and `triple.slice(0, 2)` (still unknown).
- (C) Only if a fold wants it (census +0): add a transform test that `switch-out {side: "opponent"}` recalls slot 8, plus the
  `ai-switch-check` sequence. Rename `isVoluntaryPlayerSwitchOut`.
- Consider moving `prep47*Check.ts` gates into Tier-1 fixtures (`units.json` / `seed-units.json` are compact).

## Instrument

`tools/integration/prep47OrderCensus.ts` is `prep45OrderCensus.ts` copied, with the following changes:
- **`TWO_TURN_ANIM_MOVE_IDS` matches master** (adds 76).
- **The command-submit step of a retained continuation now triggers the prompt-cycle bookkeeping** (`submitted`). Its request id does
  not change, so prep45's shadow missed it.
- **Every "without an action prompt" unit carries a class**: retained / locked side, move, status2 lock bits, continuation or fresh,
  first mover. Declines carry `withoutPromptClasses`.
- **Battle-start events are recovered** by replaying `initializeFreshFactoryBattle` with the orchestrator's inputs: the round's
  `rngValue`, both parties, `pendingBattlePreCommandRngCalls`, `carriedBattleMovePower` and `nextBattleRequestId`. Each replay is
  checked against the started battle's rules and the production seed, 300/300. Declines carry `battleStartSeed`.
- **`returnToBallCases`**: opcode, battler and segment context for every "return to ball" invalidation.

Report: `withoutPromptCases`, `withoutPromptByClass`, `battleStartSeeds`, `returnToBallCases`. Command records are otherwise
unchanged: the battle digest equals the union census fixture
(`fixtures/live-share-census/report-seeds0-299-union-45a5832f7.json`).

## Reproduce

    OUT=/tmp/p47-repro REC=/tmp/p47-rec sh tools/integration/prep47Run.sh   # ~9 min (probes ~1 min); SKIP_PROBES=1 / SKIP_CENSUS=1
    # prints "same <file>" for every receipt in tools/integration/fixtures/prep47/; src is applied from each .diff and reverted

Two full fresh runs (fresh probe directories, all 4 censuses) printed `same` for all 22 receipts. The first run regenerated the
census reports with the final instrument; the second reproduced every receipt, including the census reports, byte-identically.

Files (`tools/integration/`):
- `prep47OrderCensus.ts` — census instrument.
- `prep47Probe.py`, `prep47Extract.py`, `prep47Check.ts` — (A).
- `prep47SeedProbe.py`, `prep47SeedExtract.py`, `prep47SeedCheck.ts` — (B).
- `prep47AiSwitchProbe.py`, `prep47AiSwitchExtract.py`, `prep47AiSwitchCheck.ts` — (C).
- `prep47Run.sh` — reproduction.
- `prep45Chains.py`, `prep45CorpusReplay.ts`, `prep43CensusDelta.py` — reused, unchanged.

Receipts (`fixtures/prep47/`):
- `census-{before,after-retained,after-all,after-all3}-seeds0-299.json`, `census-delta-{retained,all,all3}-seeds0-299.json`
- `chains-{before,after-all}-seeds0-299.json`, `chains-predict-{retained,all}.json`
- `units.json`, `check.json`
- `seed-units.json`, `seed-check-{before,after}.json`
- `ai-switch-units.json`, `ai-switch-check-{before,after}.json`
- `replay-{before,after-retained,after-all3}.json`
- the three `.diff` files

No RGB dumps and no mGBA logs.

## Not reached / caveats

- **Dig unleash after a retained continuation (59 commands / 7314 frames)** declines at the consumer's `afterDigSetup` gate, although
  its order is known. Generalizing `digSetup` beyond "the battle's first unit" is consumer work, not probed here.
- **Dive 291 (12 commands)** is a words unit (prep45). **Fury Cutter 210** has no plan.
- **A locked player at a command boundary** is not reachable in this driver; the prep43 ROM fact (no prompt) stands.
- **The 13 `RETURNTOBALL` battler-0 recalls with no earlier body** are unidentified; Baton Pass is unmodelled. Both remain the census's
  "return to ball" stop.
- **No weather-ability leads** appear on seeds 0..299, so the SANDSTORM / SUN seeds are not probed.
- **Probe coverage per class:** two lead species of the non-locked / non-hook side. The locked attacker species was not varied, but
  the prompt pair does not depend on it: `PROMPT_CREATE` is a fixed plan over the free order.
