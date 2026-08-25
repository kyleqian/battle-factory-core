# ISSUES #127 ground truth — Baton Pass into a Spikes KO asks the player TWICE in one action

Stock-ROM receipt for the second `openpartyscreen` inside a single move action,
taken 2026-08-25 on the **Battle Scene OFF** oracle
(`http://127.0.0.1:8014`, bootstrap v5, `factory.sav`).

**Verdict: YES.** The ROM opens the party screen a **second** time inside the
same Baton Pass action, and the turn then completes normally.

## Scenario

`tools/battle-lab/mechanic-issue127-batonpass-spikes-ko-off.json` — `mechanicLab`
with `overrides.parties`, three complete legal Level-50 mons per side, no
transient state injected (every HP/side-condition change below is ROM-executed).

| Side | Slot | Species | Moves |
| --- | --- | --- | --- |
| Player | 0 | AIPOM (190) | SWORDS_DANCE (14), BATON_PASS (226), SPLASH, SPLASH |
| Player | 1 | **SHEDINJA (303)** | SPLASH ×4 |
| Player | 2 | BULBASAUR (1) | TACKLE ×4 |
| Opponent | 0/1/2 | CLOYSTER (91) / MAGIKARP (129) / HOPPIP (187) | **SPIKES (191) ×4** |

All four opponent slots carry only SPIKES, so the Factory AI has one legal
choice and lays the layer itself — no decision is injected.

**Why Shedinja.** `Cmd_switchineffects`
(`reference/pokeemerald/src/battle_script_commands.c:5241-5246`) computes
`spikesDmg = (5 - spikesAmount) * 2; gBattleMoveDamage = maxHP / spikesDmg;`
and then **`if (gBattleMoveDamage == 0) gBattleMoveDamage = 1;`**. Shedinja's
`maxHP` is 1, so *any* Spikes layer is lethal on entry — which collapses the
audit's "bench mon pre-chipped below `maxHP / 8`" recipe from ~10 staged turns
to two, with real damage only and no HP injection. Shedinja is Bug/Ghost with
Wonder Guard, so it clears the `:5230-5231` Flying/Levitate guard, and Wonder
Guard does not apply (Spikes is a direct HP subtraction, not a move hit).

## Button script (`trace.segments`, 4,542 frames total)

| Frames | Buttons | What it does |
| --- | --- | --- |
| 2 / 30 | `A` | FIGHT (the lab checkpoint leaves the action menu up, cursor on FIGHT) |
| 2 / 700 | `A` | move slot 0 = SWORDS_DANCE; opponent lays Spikes |
| 2 / 30 | `A` | FIGHT |
| 2 / 30 | `RIGHT` | move slot 1 |
| 2 / 400 | `A` | BATON_PASS |
| 2 / 40 | `RIGHT` | party cursor → slot 1 (SHEDINJA) |
| 2 / 40, 2 / 400 | `A`, `A` | SEND OUT — **first** party screen |
| 500 | | Shedinja enters, takes Spikes, faints; second party screen opens |
| 2 / 60 | `RIGHT` | party cursor off the fainted SHEDINJA (A on it answers "SHEDINJA has no energy left to battle!" and re-asks) |
| 2 / 80, 2 / 400 | `A`, `A` | SEND OUT — **second** party screen |
| 4 × (2 / 150), 700 | `A` | advance the faint/send-out messages and the next turn |

## RAM read-back (`manifest.json` semantic captures)

`cmd` = `engine.playerControllerCommand`; **22 = `CONTROLLER_CHOOSEPOKEMON`**.
`move` = `engine.currentMove`. `stages` = the player active's `statStages`.

| Frame | Player active | HP | stages[atk] | spikes | move | cmd | Note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | AIPOM (pi 0) | 130/130 | 6 | 0 | 0 | 18 | start |
| 100 | AIPOM | 130 | **8** | 0 | 14 | 2 | Swords Dance +2 |
| 300 | AIPOM | 130 | 8 | **1** | 191 | 51 | opponent lays one layer |
| 820 | AIPOM | 130 | 8 | 1 | **226** | 16 | Baton Pass starts |
| 880 | AIPOM | 130 | 8 | 1 | 226 | **22** | **first** party screen |
| 1380 | **SHEDINJA (pi 1)** | 1/1 | **8** | 1 | 0 | 16 | the passed +2 Atk landed on the recipient |
| 1540 | SHEDINJA | **0** | 8 | 1 | 0 | 16 | fainted on entry to Spikes, inside the action |
| 1720 | SHEDINJA | 0 | **6** | 1 | 0 | 16 | faint clears the stages |
| 2220 | SHEDINJA | 0 | 6 | 1 | 0 | **22** | **second** party screen — same action, no turn boundary |
| 2920 | **AIPOM (pi 0)** | 130 | **6** | 1 | 0 | 16 | final replacement in; the passed stages did **not** survive |
| 3060 | AIPOM | **114** | 6 | 1 | 0 | 16 | its own Spikes hit: 130 − 130/8 = 130 − 16 |
| 3400 | AIPOM | 114 | 6 | 1 | 14 | 16 | **next turn runs normally** (Swords Dance again) |
| 3660 | AIPOM | 114 | 8 | **2** | 191 | 51 | opponent lays a second layer |

`rngValue` is `1621732966` through turn 1 and `1160559944` from frame 500 on —
it does **not** advance across either party screen or the entry faint, so the
second forced switch spends no RNG of its own.

### The four load-bearing facts

1. **`playerControllerCommand` reaches 22 twice inside one action** (frames 880
   and 2220) with `currentMove == 226` and no turn boundary between them. The
   second `openpartyscreen` is real; the port's throw was on a live state.
2. **Baton Pass's stat stages land on the recipient** (frame 1380: Shedinja at
   `stages[atk] == 8`) and are **cleared by its faint** (1720), so the FINAL
   replacement enters at 6 (2920) — the passed stages do not chain past a KO.
3. **The next replacement takes its own Spikes damage** (2920 → 3060,
   130 → 114 = `maxHP / 8`): the transient `SIDE_STATUS_SPIKES_DAMAGED` guard is
   already clear again by the time the fainted replacement switches in
   (`Cmd_tryfaintmon`'s spikes variant, `battle_script_commands.c:2978`).
4. **The turn completes and the battle continues** (3400/3660): the second
   forced switch is an ordinary boundary, not a terminal state.

### Trace-driving notes (for whoever re-runs this)

* The in-battle party screen puts the **active** battler in the big left box, so
  after the entry faint the cursor starts on the fainted SHEDINJA. Pressing `A`
  there yields "SHEDINJA has no energy left to battle!" and re-asks — the trace
  needs a `RIGHT` first. This cost three oracle iterations.
* The mon that Baton Passed out (slot 0) stays alive on the bench and **is** a
  legal choice on the second screen; the receipt above chose it.
* `overrides.parties` rejects `"gender": "male"` for species 303 — Shedinja is
  genderless, so omit the field.

## What this pins in the port

`tests/factoryBattleScriptSecondForcedSwitchResume.test.ts`. Facts 1 and 4 are
oracle-pinned by this receipt. Fact 3 was already pinned source-side by
`tests/forcedSwitchSecondChoiceIssue119.test.ts` and is re-checked here. Fact 2
(stages cleared by the recipient's faint) is asserted from this receipt; the
port reaches the same value.
